#!/usr/bin/env node
/**
 * HTTP oracle verify for a hub project (G952): emit + start server + chrysalis verify.
 */
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { prepareProjectVerifyEmit, inferHubProjectOrigin } from "./hub-verify-replay.mjs";
import { loadHubProbeContext, probeHubGoldCorpus } from "./hub-verify-probe-corpus.mjs";

export const HUB_VERIFY_HTTP_KIND = "chrysalis.hub.verify-http";
export const HUB_VERIFY_HTTP_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliBin = join(scriptRoot, "packages/cli/dist/bin.js");

function freePort() {
  return new Promise((resolvePort, reject) => {
    const s = createServer();
    s.listen(0, "127.0.0.1", () => {
      const addr = s.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      s.close(() => resolvePort(port));
    });
    s.on("error", reject);
  });
}

/**
 * @param {import("../../packages/oracle/dist/index.js").TraceCorpus} corpus
 * @param {string} tracesDir
 */
function writeTraceCorpus(corpus, tracesDir) {
  const day = corpus.createdAt.slice(0, 10);
  const dayDir = join(tracesDir, day);
  mkdirSync(dayDir, { recursive: true });
  for (const trace of corpus.traces) {
    const lines = [
      JSON.stringify(trace.header),
      ...trace.events.map((e) => JSON.stringify(e)),
      JSON.stringify(trace.footer),
    ];
    writeFileSync(join(dayDir, `${trace.header.traceId}.ndjson`), `${lines.join("\n")}\n`, "utf8");
  }
}

/**
 * @param {string} baseUrl
 * @param {Array<{ method: string, path: string }>} routes
 * @param {number} [timeoutMs]
 */
async function waitForHttpServer(baseUrl, routes, timeoutMs = 20000) {
  const paths = routes.length > 0 ? routes.map((r) => r.path) : ["/"];
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    for (const path of paths) {
      try {
        const r = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
          method: routes.find((x) => x.path === path)?.method ?? "GET",
          signal: AbortSignal.timeout(3000),
        });
        if (r.status < 500) return true;
      } catch {
        // retry
      }
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

/**
 * @param {string} emitDir
 * @param {number} port
 */
function startEmittedServer(emitDir, port) {
  const child = spawn(process.execPath, ["--import", "tsx", "src/index.ts"], {
    cwd: emitDir,
    env: { ...process.env, PORT: String(port), NODE_ENV: "production" },
    stdio: "ignore",
  });
  return child;
}

/**
 * @param {import("node:child_process").ChildProcess | null} child
 */
async function stopEmittedServer(child) {
  if (!child || child.killed) return;
  await new Promise((resolveStop) => {
    child.on("exit", () => resolveStop());
    try {
      child.kill();
    } catch {
      resolveStop();
      return;
    }
    setTimeout(() => {
      try {
        if (!child.killed) child.kill("SIGKILL");
      } catch {
        /* ignore */
      }
      resolveStop();
    }, 3000);
  });
}

/**
 * @param {string} projectDir
 * @param {{ origin?: string, target?: string, repoRoot?: string, threshold?: number }} [opts]
 */
export async function runProjectVerifyHttp(projectDir, opts = {}) {
  const root = resolve(projectDir);
  const origin = opts.origin ?? inferHubProjectOrigin(root);
  const target = opts.target ?? "hono";
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const threshold = opts.threshold ?? 1;

  if (!existsSync(cliBin)) {
    return {
      kind: HUB_VERIFY_HTTP_KIND,
      schemaVersion: HUB_VERIFY_HTTP_SCHEMA_VERSION,
      projectDir: root,
      ok: false,
      skip: "no-cli-bin",
      origin,
      target,
      generatedAt: new Date().toISOString(),
    };
  }

  const prepared = await prepareProjectVerifyEmit(root, { origin, target, repoRoot });
  if (!prepared.ok) {
    return {
      kind: HUB_VERIFY_HTTP_KIND,
      schemaVersion: HUB_VERIFY_HTTP_SCHEMA_VERSION,
      projectDir: root,
      ok: false,
      skip: prepared.skip ?? "prepare-failed",
      detail: prepared.detail ?? null,
      origin,
      target,
      generatedAt: new Date().toISOString(),
    };
  }

  /** @type {import("node:child_process").ChildProcess | null} */
  let serverChild = null;
  try {
    const ctx = await loadHubProbeContext(root, origin, target, repoRoot);
    const corpus = await probeHubGoldCorpus({
      routes: ctx.routes,
      middlewarePresets: ctx.middlewarePresets,
      inProcessFetch: ctx.inProcessFetch,
      fixture: ctx.fixture,
      corpusId: "hub-http-probe",
    });

    const tracesDir = join(root, ".chrysalis", "traces");
    if (existsSync(tracesDir)) rmSync(tracesDir, { recursive: true, force: true });
    writeTraceCorpus(corpus, tracesDir);

    const port = await freePort();
    const baseUrl = `http://127.0.0.1:${port}`;
    serverChild = startEmittedServer(prepared.outDir, port);
    const up = await waitForHttpServer(baseUrl, ctx.routes);
    if (!up) {
      return {
        kind: HUB_VERIFY_HTTP_KIND,
        schemaVersion: HUB_VERIFY_HTTP_SCHEMA_VERSION,
        projectDir: root,
        ok: false,
        skip: "server-start-timeout",
        baseUrl,
        origin,
        target,
        routeCount: ctx.routes.length,
        traceCount: corpus.traces.length,
        generatedAt: new Date().toISOString(),
      };
    }

    const reportDir = join(root, "reports", "verify");
    mkdirSync(reportDir, { recursive: true });
    const verify = spawnSync(
      process.execPath,
      [
        cliBin,
        "verify",
        tracesDir,
        "--base-url",
        baseUrl,
        "--report",
        reportDir,
        "--project",
        root,
        "--threshold",
        String(threshold),
        "--json-summary",
        "--disable-cookie-chain",
      ],
      { cwd: repoRoot, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
    );

    let summary = null;
    const summaryPath = join(reportDir, "summary.json");
    if (existsSync(summaryPath)) {
      try {
        summary = JSON.parse(readFileSync(summaryPath, "utf8"));
      } catch {
        summary = null;
      }
    }
    const correctness = summary?.aggregate?.correctness ?? null;
    const gatePass = correctness !== null && correctness >= threshold;
    const ok = gatePass;

    return {
      kind: HUB_VERIFY_HTTP_KIND,
      schemaVersion: HUB_VERIFY_HTTP_SCHEMA_VERSION,
      projectDir: root,
      ok,
      skip: ok ? null : verify.status !== 0 ? "verify-failed" : "correctness-below-threshold",
      origin,
      target,
      baseUrl,
      summaryPath: existsSync(summaryPath) ? summaryPath : null,
      correctness,
      routeCount: ctx.routes.length,
      traceCount: corpus.traces.length,
      exitCode: verify.status ?? 1,
      generatedAt: new Date().toISOString(),
    };
  } finally {
    await stopEmittedServer(serverChild);
  }
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
    throw new Error("usage: hub-verify-http.mjs --project <dir> [--origin php|javascript] [--target hono]");
  }
  return { projectDir, origin, target };
}

async function main() {
  const { projectDir, origin, target } = parseArgs(process.argv);
  const report = await runProjectVerifyHttp(projectDir, {
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
