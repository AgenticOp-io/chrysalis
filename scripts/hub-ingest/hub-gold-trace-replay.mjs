#!/usr/bin/env node
/**
 * Lift + emit + in-process trace replay oracle for hub gold literal suites.
 */
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { HUB_GOLD_SUITES, resolveGoldSuites } from "./hub-gold-manifest.mjs";
import { runHubWptpContractGoldSuite } from "./hub-wptp-contract-gold.mjs";
import { exportPhpHubWebir } from "./hub-php-hub-webir.mjs";
import { isHubNativeGoldEmitTarget } from "./hub-gold-native-emit.mjs";
import { runNativeTraceReplaySuite } from "./hub-gold-native-trace-replay.mjs";
import { runCwlTraceReplaySuite } from "./hub-gold-cwl-trace-replay.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");
const emitScript = join(scriptRoot, "scripts/hub-ingest/emit-from-hub.mjs");
const emitNextjsScript = join(scriptRoot, "scripts/hub-ingest/emit-nextjs-from-hub.mjs");
const workerScript = join(scriptRoot, "scripts/hub-ingest/hub-gold-replay-worker.mjs");

function parseArgs(argv) {
  let suiteId = null;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--suite" && argv[i + 1]) suiteId = argv[++i];
  }
  return { suiteId };
}

function parseStdoutJson(stdout) {
  const text = stdout.trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return {};
  return JSON.parse(text.slice(start, end + 1));
}

/**
 * @param {import('./hub-gold-manifest.mjs').HUB_GOLD_SUITES[number]} suite
 */
export async function runTraceReplaySuite(suite) {
  const fixture = suite.fixture;
  const origin = suite.origin;
  const target = suite.emitTarget;

  if (target === "cwl") {
    return runCwlTraceReplaySuite(suite);
  }

  if (isHubNativeGoldEmitTarget(target)) {
    return runNativeTraceReplaySuite(suite);
  }

  if (suite.wptpCompose) {
    const composeTarget = target === "nextjs" ? "nextjs" : "hono";
    const wptp = await runHubWptpContractGoldSuite(composeTarget);
    if (wptp.skipped) throw new Error(`wptp compose skipped: ${wptp.skip ?? "unknown"}`);
    if (!wptp.ok) throw new Error(wptp.reason ?? "wptp compose failed");
    const outDir = join(fixture, "generated", composeTarget);
    if (composeTarget === "hono") {
      const runtimePkg = "hono";
      if (!existsSync(join(outDir, "node_modules", runtimePkg))) {
        const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
        const inst = spawnSync(npmCmd, ["install", "--no-audit", "--no-fund", "--prefer-offline"], {
          cwd: outDir,
          encoding: "utf8",
          shell: process.platform === "win32",
        });
        if (inst.status !== 0) throw new Error(inst.stderr || inst.stdout || "npm install failed");
      }
    }
    const replay = spawnSync(
      process.execPath,
      ["--import", "tsx", workerScript, fixture, "--origin", origin, "--target", composeTarget],
      { cwd: scriptRoot, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
    );
    if (replay.status !== 0) {
      throw new Error(replay.stderr || replay.stdout || "trace replay failed");
    }
    const report = parseStdoutJson(replay.stdout);
    return { ...report, suiteId: suite.id };
  }

  const emitArgs =
    target === "nextjs"
      ? [emitNextjsScript, [fixture, "--origin", origin]]
      : [emitScript, [fixture, "--origin", origin, "--target", target]];
  if (origin === "php") {
    const phpExport = await exportPhpHubWebir(fixture);
    if (phpExport.skip || !phpExport.ok) {
      throw new Error(phpExport.skip ?? `php-export-holes:${phpExport.holeCount}`);
    }
  } else {
    const lift = spawnSync(process.execPath, [liftScript, [fixture, "--language", origin]], {
      cwd: scriptRoot,
      encoding: "utf8",
    });
    if (lift.status !== 0) {
      throw new Error(lift.stderr || lift.stdout || "lift failed");
    }
  }
  const emitOnly = emitArgs;
  const r = spawnSync(process.execPath, [emitOnly[0], ...emitOnly[1]], { cwd: scriptRoot, encoding: "utf8" });
  if (r.status !== 0) {
    throw new Error(r.stderr || r.stdout || `${emitOnly[0]} failed`);
  }

  const outDir = join(fixture, "generated", target);
  if (target === "nextjs") {
    const replay = spawnSync(
      process.execPath,
      ["--import", "tsx", workerScript, fixture, "--origin", origin, "--target", target],
      { cwd: scriptRoot, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
    );
    if (replay.status !== 0) {
      throw new Error(replay.stderr || replay.stdout || "trace replay failed");
    }
    const report = parseStdoutJson(replay.stdout);
    return { ...report, suiteId: suite.id };
  }

  const runtimePkg = target === "fastify" ? "fastify" : "hono";
  if (!existsSync(join(outDir, "node_modules", runtimePkg))) {
    const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
    const inst = spawnSync(npmCmd, ["install", "--no-audit", "--no-fund", "--prefer-offline"], {
      cwd: outDir,
      encoding: "utf8",
      shell: process.platform === "win32",
    });
    if (inst.status !== 0) throw new Error(inst.stderr || inst.stdout || "npm install failed");
  }

  const replay = spawnSync(
    process.execPath,
    ["--import", "tsx", workerScript, fixture, "--origin", origin, "--target", target],
    { cwd: scriptRoot, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
  );
  if (replay.status !== 0) {
    throw new Error(replay.stderr || replay.stdout || "trace replay failed");
  }
  const report = parseStdoutJson(replay.stdout);
  return { ...report, suiteId: suite.id };
}

async function main() {
  const { suiteId } = parseArgs(process.argv);
  const suites = resolveGoldSuites(suiteId ?? undefined).filter((s) => s.traceReplay);
  const results = [];
  for (const suite of suites) {
    const report = await runTraceReplaySuite(suite);
    results.push(report);
    if (!report.ok) process.exit(1);
  }

  const aggOk = results.every((r) => r.ok);
  const minCorrectness = Math.min(...results.map((r) => r.correctness ?? 0));
  console.log(
    JSON.stringify(
      {
        kind: "chrysalis.hub.trace-replay",
        schemaVersion: 1,
        ok: aggOk,
        suiteCount: results.length,
        correctness: minCorrectness,
        results,
      },
      null,
      2,
    ),
  );
  if (!aggOk) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
