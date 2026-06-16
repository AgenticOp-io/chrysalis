#!/usr/bin/env node
/**
 * In-process trace replay verify for a hub project (G921).
 * Lift/export + emit + hub-gold-replay-worker; writes reports/verify/summary.json.
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { exportPhpHubWebir } from "./hub-php-hub-webir.mjs";

export const HUB_VERIFY_REPLAY_KIND = "chrysalis.hub.verify-replay";
export const HUB_VERIFY_REPLAY_SCHEMA_VERSION = 1;
export const HUB_VERIFY_PREPARE_KIND = "chrysalis.hub.verify-prepare";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");
const emitScript = join(scriptRoot, "scripts/hub-ingest/emit-from-hub.mjs");
const workerScript = join(scriptRoot, "scripts/hub-ingest/hub-gold-replay-worker.mjs");

function parseStdoutJson(stdout) {
  const text = stdout.trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * @param {string} projectDir
 */
export function inferHubProjectOrigin(projectDir) {
  const root = resolve(projectDir);
  if (existsSync(join(root, "src", "app.js"))) return "javascript";
  return "php";
}

/**
 * @param {string} projectDir
 * @param {string} target
 */
export function isVerifyEmitComplete(projectDir, target) {
  const outDir = join(resolve(projectDir), "generated", target);
  const handlersDir = join(outDir, "src", "handlers");
  if (!existsSync(join(outDir, "src", "ctx.ts"))) return false;
  if (!existsSync(join(outDir, "src", "server.ts"))) return false;
  if (!existsSync(handlersDir)) return false;
  try {
    return readdirSync(handlersDir).some((f) => f.endsWith(".ts"));
  } catch {
    return false;
  }
}

/**
 * @param {string} projectDir
 * @param {string} origin
 */
export function isHubWebirReady(projectDir, origin) {
  const root = resolve(projectDir);
  if (existsSync(join(root, ".chrysalis", `hub.${origin}.webir.json`))) return true;
  return existsSync(join(root, ".chrysalis", "ingested.webir.json"));
}

/**
 * @param {string} projectDir
 * @param {string} target
 * @param {string} repoRoot
 */
async function ensureVerifyEmitNpmInstall(projectDir, target, repoRoot) {
  const root = resolve(projectDir);
  const outDir = join(root, "generated", target);
  if (target === "nextjs") {
    return { ok: true, outDir, skip: null, detail: null };
  }
  const runtimePkg = target === "fastify" ? "fastify" : "hono";
  if (existsSync(join(outDir, "node_modules", runtimePkg))) {
    return { ok: true, outDir, skip: null, detail: null };
  }
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const inst = spawnSync(npmCmd, ["install", "--no-audit", "--no-fund", "--prefer-offline"], {
    cwd: outDir,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (inst.status !== 0) {
    return {
      ok: false,
      outDir: null,
      skip: "npm-install-failed",
      detail: (inst.stderr || inst.stdout)?.slice(0, 400) ?? null,
    };
  }
  return { ok: true, outDir, skip: null, detail: null };
}

/**
 * @param {string} projectDir
 * @param {{ origin?: string, target?: string, repoRoot?: string }} [opts]
 */
export async function prepareProjectVerifyEmit(projectDir, opts = {}) {
  const root = resolve(projectDir);
  const origin = opts.origin ?? inferHubProjectOrigin(root);
  const target = opts.target ?? "hono";
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const forceReemit =
    opts.forceReemit === true || process.env.CHRYSALIS_HUB_VERIFY_FORCE_REEMIT === "1";
  const skipReemitIfComplete =
    !forceReemit &&
    opts.skipReemitIfComplete !== false &&
    process.env.CHRYSALIS_HUB_VERIFY_SKIP_REEMIT !== "0";

  if (
    skipReemitIfComplete &&
    isVerifyEmitComplete(root, target) &&
    isHubWebirReady(root, origin)
  ) {
    const npm = await ensureVerifyEmitNpmInstall(root, target, repoRoot);
    if (!npm.ok) {
      return {
        kind: HUB_VERIFY_PREPARE_KIND,
        ok: false,
        skip: npm.skip ?? "npm-install-failed",
        detail: npm.detail ?? null,
        projectDir: root,
        origin,
        target,
        outDir: null,
      };
    }
    return {
      kind: HUB_VERIFY_PREPARE_KIND,
      ok: true,
      skip: "emit-already-complete",
      projectDir: root,
      origin,
      target,
      outDir: npm.outDir,
      repoRoot,
    };
  }

  if (origin === "php") {
    const phpExport = await exportPhpHubWebir(root);
    if (phpExport.skip || !phpExport.ok) {
      return {
        kind: HUB_VERIFY_PREPARE_KIND,
        ok: false,
        skip: phpExport.skip ?? "php-export-failed",
        projectDir: root,
        origin,
        target,
        outDir: null,
      };
    }
  } else {
    const lift = spawnSync(process.execPath, [liftScript, root, "--language", origin], {
      cwd: repoRoot,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    });
    if (lift.status !== 0) {
      return {
        kind: HUB_VERIFY_PREPARE_KIND,
        ok: false,
        skip: "lift-failed",
        detail: (lift.stderr || lift.stdout)?.slice(0, 400) ?? null,
        projectDir: root,
        origin,
        target,
        outDir: null,
      };
    }
  }

  const emit = spawnSync(process.execPath, [emitScript, root, "--origin", origin, "--target", target], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (emit.status !== 0) {
    return {
      kind: HUB_VERIFY_PREPARE_KIND,
      ok: false,
      skip: "emit-failed",
      detail: (emit.stderr || emit.stdout)?.slice(0, 400) ?? null,
      projectDir: root,
      origin,
      target,
      outDir: null,
    };
  }

  const npm = await ensureVerifyEmitNpmInstall(root, target, repoRoot);
  if (!npm.ok) {
    return {
      kind: HUB_VERIFY_PREPARE_KIND,
      ok: false,
      skip: npm.skip ?? "npm-install-failed",
      detail: npm.detail ?? null,
      projectDir: root,
      origin,
      target,
      outDir: null,
    };
  }

  return {
    kind: HUB_VERIFY_PREPARE_KIND,
    ok: true,
    skip: null,
    projectDir: root,
    origin,
    target,
    outDir: npm.outDir,
    repoRoot,
  };
}

/**
 * Pre-warm hono+fastify verify emits for flagship fixtures (GCE post110 / hub HTTP verify).
 * @param {{ profiles?: string[], targets?: string[], progress?: { start: (label: string) => number, end: (label: string, ok: boolean, t0: number) => void }, repoRoot?: string }} [opts]
 */
export async function prewarmFlagshipVerifyEmits(opts = {}) {
  const { FLAGSHIP_VERIFY_GAPS_FIXTURES } = await import("./hub-flagship-verify-gaps-standalone-smoke.mjs");
  const { createSmokeProgress } = await import("./hub-smoke-progress.mjs");
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const profiles = opts.profiles ?? ["plainPhp", "symfony", "express"];
  const targets = opts.targets ?? ["hono", "fastify"];
  const progress = opts.progress ?? createSmokeProgress("flagship-verify-prewarm");
  /** @type {Record<string, Record<string, Awaited<ReturnType<typeof prepareProjectVerifyEmit>>>>} */
  const results = {};
  for (const profile of profiles) {
    const rel = FLAGSHIP_VERIFY_GAPS_FIXTURES[profile]?.rel;
    if (!rel) continue;
    const root = join(repoRoot, rel);
    const origin = inferHubProjectOrigin(root);
    results[profile] = {};
    for (const target of targets) {
      const label = `${profile}/${target}`;
      const t0 = progress.start(label);
      const prepared = await prepareProjectVerifyEmit(root, { origin, target, repoRoot });
      progress.end(label, prepared.ok === true, t0);
      results[profile][target] = prepared;
    }
  }
  const ok = Object.values(results).every((byTarget) =>
    Object.values(byTarget).every((r) => r.ok === true),
  );
  return { ok, results, generatedAt: new Date().toISOString() };
}

/**
 * @param {string} projectDir
 * @param {{ origin?: string, target?: string, repoRoot?: string }} [opts]
 */
export async function runProjectVerifyReplay(projectDir, opts = {}) {
  const root = resolve(projectDir);
  const origin = opts.origin ?? inferHubProjectOrigin(root);
  const target = opts.target ?? "hono";
  const repoRoot = opts.repoRoot ?? scriptRoot;

  const prepared = await prepareProjectVerifyEmit(root, { origin, target, repoRoot });
  if (!prepared.ok) {
    return {
      kind: HUB_VERIFY_REPLAY_KIND,
      schemaVersion: HUB_VERIFY_REPLAY_SCHEMA_VERSION,
      projectDir: root,
      ok: false,
      skip: prepared.skip ?? "prepare-failed",
      detail: prepared.detail ?? null,
      origin,
      target,
      generatedAt: new Date().toISOString(),
    };
  }

  const replay = spawnSync(
    process.execPath,
    ["--import", "tsx", workerScript, root, "--origin", origin, "--target", target],
    { cwd: repoRoot, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  );
  const parsed = parseStdoutJson(replay.stdout ?? "");
  const correctness = parsed?.correctness ?? parsed?.report?.aggregate?.correctness ?? null;
  const report = parsed?.report ?? null;

  const reportDir = join(root, "reports", "verify");
  mkdirSync(reportDir, { recursive: true });
  const summaryPath = join(reportDir, "summary.json");
  if (report) {
    writeFileSync(summaryPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }

  const ok = replay.status === 0 && correctness !== null && correctness >= 1;
  return {
    kind: HUB_VERIFY_REPLAY_KIND,
    schemaVersion: HUB_VERIFY_REPLAY_SCHEMA_VERSION,
    projectDir: root,
    ok,
    skip: ok ? null : replay.status !== 0 ? "replay-failed" : "correctness-below-threshold",
    origin,
    target,
    summaryPath: report ? summaryPath : null,
    correctness,
    routeCount: parsed?.routeCount ?? null,
    traceCount: parsed?.traceCount ?? null,
    exitCode: replay.status ?? 1,
    generatedAt: new Date().toISOString(),
  };
}

function parseArgs(argv) {
  let projectDir = null;
  let origin = null;
  let target = "hono";
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--project" && argv[i + 1]) projectDir = resolve(argv[++i]);
    else if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
    else if (argv[i] === "--target" && argv[i + 1]) target = argv[++i];
  }
  if (!projectDir) {
    throw new Error("usage: hub-verify-replay.mjs --project <dir> [--origin php|javascript] [--target hono]");
  }
  return { projectDir, origin, target };
}

async function main() {
  const { projectDir, origin, target } = parseArgs(process.argv);
  const report = await runProjectVerifyReplay(projectDir, {
    origin: origin ?? undefined,
    target,
  });
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
