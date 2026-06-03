#!/usr/bin/env node
/**
 * Node/Express flagship: live oracle capture on legacy Express + verify replay on emitted Hono (G112).
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expressFlagshipRoutesArg } from "./hub-express-flagship-routes.mjs";

export const HUB_NODE_EXPRESS_ORACLE_VERIFY_KIND = "chrysalis.hub.node-express-oracle-verify";
export const HUB_NODE_EXPRESS_ORACLE_VERIFY_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixture = join(scriptRoot, "fixtures/hub-flagship-express");
const serveScript = join(fixture, "src/serve.mjs");
const replayWorker = join(scriptRoot, "scripts/hub-ingest/hub-node-express-replay-worker.mjs");
const tracesRoot = join(fixture, "traces");
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");
const emitScript = join(scriptRoot, "scripts/hub-ingest/emit-from-hub.mjs");
const recordScript = join(scriptRoot, "packages/oracle-node/record-live-http.mjs");

function parseStdoutJson(stdout) {
  const text = stdout.trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return {};
  return JSON.parse(text.slice(start, end + 1));
}

function runStep(script, args, extraArgv = []) {
  const r = spawnSync(process.execPath, [...extraArgv, script, ...args], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  return { ok: r.status === 0, stdout: r.stdout, stderr: r.stderr };
}

function ensureHonoDeps(outDir) {
  const runtimePkg = "hono";
  if (existsSync(join(outDir, "node_modules", runtimePkg))) return true;
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const inst = spawnSync(npmCmd, ["install", "--no-audit", "--no-fund", "--prefer-offline"], {
    cwd: outDir,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  return inst.status === 0;
}

function expressServerStartTimeoutMs() {
  const raw = process.env.CHRYSALIS_EXPRESS_SERVER_START_TIMEOUT_MS;
  if (raw != null && raw !== "") {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 15000;
}

/**
 * @param {number} [timeoutMs]
 */
function startExpressServer(timeoutMs = expressServerStartTimeoutMs()) {
  return new Promise((resolveP, reject) => {
    const child = spawn(process.execPath, [serveScript], {
      cwd: join(fixture, "src"),
      env: { ...process.env, PORT: "0" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill();
        reject(new Error("express server start timeout"));
      }
    }, timeoutMs);
    child.stdout.on("data", (c) => {
      stdout += String(c);
      if (stdout.includes("{")) {
        try {
          const meta = parseStdoutJson(stdout);
          if (meta.port && !settled) {
            settled = true;
            clearTimeout(timer);
            resolveP({ child, port: meta.port, host: meta.host ?? "127.0.0.1" });
          }
        } catch {
          /* wait for full JSON line */
        }
      }
    });
    child.on("error", (e) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(e);
      }
    });
    child.on("exit", (code) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(new Error(`express server exited early: ${code}\n${stdout}`));
      }
    });
  });
}

/**
 * @param {import('node:child_process').ChildProcess} child
 */
async function stopServer(child) {
  return new Promise((resolveP) => {
    if (!child || child.killed) {
      resolveP();
      return;
    }
    child.on("exit", () => resolveP());
    child.kill();
    setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {
        /* ignore */
      }
      resolveP();
    }, 3000);
  });
}

export async function runNodeExpressOracleVerify() {
  const base = {
    kind: HUB_NODE_EXPRESS_ORACLE_VERIFY_KIND,
    schemaVersion: HUB_NODE_EXPRESS_ORACLE_VERIFY_SCHEMA_VERSION,
    fixture: "fixtures/hub-flagship-express",
    ok: false,
    correctness: null,
    traceCount: null,
  };

  if (!existsSync(serveScript)) {
    return { ...base, skip: "missing-serve-script" };
  }

  const expressPkg = join(fixture, "node_modules", "express");
  if (!existsSync(expressPkg)) {
    const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
    const inst = spawnSync(npmCmd, ["install", "--no-audit", "--no-fund"], {
      cwd: fixture,
      encoding: "utf8",
      shell: process.platform === "win32",
    });
    if (inst.status !== 0) {
      return { ...base, skip: "express-npm-install-failed", detail: inst.stderr?.slice(0, 300) };
    }
  }

  const lift = runStep(liftScript, [fixture, "--language", "javascript"]);
  if (!lift.ok) {
    return { ...base, skip: "lift-failed", detail: lift.stderr?.slice(0, 300) };
  }
  const liftReport = parseStdoutJson(lift.stdout);
  if ((liftReport.holeCount ?? 1) !== 0) {
    return { ...base, skip: "lift-holes", holeCount: liftReport.holeCount };
  }

  const emit = runStep(emitScript, [fixture, "--origin", "javascript", "--target", "hono"]);
  if (!emit.ok) {
    return { ...base, skip: "emit-failed", detail: emit.stderr?.slice(0, 300) };
  }

  await rm(tracesRoot, { recursive: true, force: true });
  await mkdir(tracesRoot, { recursive: true });

  let server = null;
  try {
    server = await startExpressServer();
    const baseUrl = `http://${server.host}:${server.port}`;
    const record = runStep(recordScript, [
      "--base-url",
      baseUrl,
      "--corpus-dir",
      tracesRoot,
      "--routes",
      expressFlagshipRoutesArg(),
    ]);
    if (!record.ok) {
      return { ...base, skip: "record-failed", detail: record.stderr?.slice(0, 300) };
    }
    const recordReport = parseStdoutJson(record.stdout);
    base.traceCount = recordReport.traceCount ?? null;

    const outDir = join(fixture, "generated", "hono");
    if (!ensureHonoDeps(outDir)) {
      return { ...base, skip: "hono-npm-install-failed" };
    }
    const replay = runStep(replayWorker, [fixture, tracesRoot], ["--import", "tsx"]);
    if (!replay.ok) {
      return { ...base, skip: "replay-failed", detail: replay.stderr?.slice(0, 400) };
    }
    const replayReport = parseStdoutJson(replay.stdout);
    const correctness = replayReport.correctness ?? 0;
    return {
      ...base,
      ok: replayReport.ok === true,
      correctness,
      framesTotal: replayReport.framesTotal ?? null,
      framesPassed: replayReport.framesPassed ?? null,
      tracesRoot,
      legacyBaseUrl: baseUrl,
    };
  } finally {
    if (server?.child) await stopServer(server.child);
  }
}

async function main() {
  const report = await runNodeExpressOracleVerify();
  console.log(JSON.stringify(report, null, 2));
  if (report.skip) process.exit(0);
  if (!report.ok) process.exit(1);
  process.exit(0);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
