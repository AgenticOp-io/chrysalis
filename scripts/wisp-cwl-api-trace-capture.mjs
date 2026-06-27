#!/usr/bin/env node
/**
 * Capture WISP API oracle traces for Phase 28d pilot (GET /api/tenants).
 * Usage: node scripts/wisp-cwl-api-trace-capture.mjs [--live-base-url https://hss.wisptools.io]
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { applyWispApiPilotHandler } from "./wisp-cwl-apply-api-pilot-handler.mjs";
import { applyWispApiGoldenHandlers } from "./wisp-cwl-apply-api-golden-handlers.mjs";
import {
  goldenFileName,
  listApiRouteSpecs,
  resourceFromSlug,
  slugFromApiId,
} from "./wisp-cwl-api-oracle-contract.mjs";

export const WISP_API_TRACE_CAPTURE_KIND = "chrysalis.wisp.api-trace-capture";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const oracleFixture = join(scriptRoot, "fixtures/hub-wisp-api-oracle");
const serveScript = join(oracleFixture, "src/serve.mjs");
const recordScript = join(scriptRoot, "packages/oracle-node/record-live-http.mjs");
const wispFixture = join(scriptRoot, "fixtures/hub-wisp-management");
const tracesRoot = join(wispFixture, "wisp-api-pilot-traces");
const goldenPath = join(wispFixture, "wisp-api-tenants-get.golden.json");
const goldensDir = join(wispFixture, "wisp-api-goldens");
const pilotManifestPath = join(wispFixture, "chrysalis.wisp-api-trace-pilot.v1.json");

const PILOT_ROUTE = { method: "GET", path: "/api/tenants" };

function parseStdoutJson(stdout) {
  const text = stdout.trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return {};
  return JSON.parse(text.slice(start, end + 1));
}

function runStep(script, args) {
  const r = spawnSync(process.execPath, [script, ...args], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  return { ok: r.status === 0, stdout: r.stdout, stderr: r.stderr };
}

function ensureOracleDeps() {
  if (existsSync(join(oracleFixture, "node_modules", "express"))) return true;
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const inst = spawnSync(npmCmd, ["install", "--no-audit", "--no-fund"], {
    cwd: oracleFixture,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  return inst.status === 0;
}

function startOracleServer(timeoutMs = 15000) {
  return new Promise((resolveP, reject) => {
    const child = spawn(process.execPath, [serveScript], {
      cwd: join(oracleFixture, "src"),
      env: { ...process.env, PORT: "0" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill();
        reject(new Error("oracle server start timeout"));
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
          /* wait */
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
  });
}

async function stopServer(child) {
  if (!child || child.killed) return;
  await new Promise((resolveP) => {
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

/**
 * @param {object} [opts]
 * @param {string} [opts.liveBaseUrl]
 * @param {boolean} [opts.allRoutes]
 */
export async function runWispApiTraceCaptureAll(opts = {}) {
  const specs = listApiRouteSpecs();
  if (!specs.length) {
    return { kind: WISP_API_TRACE_CAPTURE_KIND, schemaVersion: 1, ok: false, skip: "empty-api-manifest" };
  }
  const base = {
    kind: WISP_API_TRACE_CAPTURE_KIND,
    schemaVersion: 1,
    ok: false,
    mode: "all-routes",
    routeCount: specs.length,
  };

  let baseUrl = opts.liveBaseUrl?.replace(/\/$/, "") ?? "";
  let server = null;
  let source = "oracle-fixture";
  if (!baseUrl) {
    if (!existsSync(serveScript)) return { ...base, skip: "missing-oracle-serve" };
    if (!ensureOracleDeps()) return { ...base, skip: "oracle-npm-install-failed" };
    server = await startOracleServer();
    baseUrl = `http://${server.host}:${server.port}`;
  } else {
    source = "live-backend";
  }

  try {
    if (existsSync(tracesRoot)) rmSync(tracesRoot, { recursive: true, force: true });
    mkdirSync(tracesRoot, { recursive: true });
    mkdirSync(goldensDir, { recursive: true });
    const routesArg = specs.map((s) => `${s.method} ${s.path}`).join(",");
    const record = runStep(recordScript, [
      "--base-url",
      baseUrl,
      "--corpus-dir",
      tracesRoot,
      "--routes",
      routesArg,
    ]);
    if (!record.ok) {
      return { ...base, skip: "record-failed", detail: record.stderr?.slice(0, 400), baseUrl, source };
    }
    const recordReport = parseStdoutJson(record.stdout);
    const day = new Date().toISOString().slice(0, 10);
    const traceFiles = existsSync(join(tracesRoot, day))
      ? readdirSync(join(tracesRoot, day)).filter((f) => f.endsWith(".ndjson"))
      : [];

    /** @type {Array<Record<string, unknown>>} */
    const pilotRoutes = [];
    for (const spec of specs) {
      const probe = await fetch(`${baseUrl}${spec.path}`, {
        method: spec.method,
        signal: AbortSignal.timeout(15_000),
      });
      const bodyText = await probe.text();
      let golden;
      try {
        golden = JSON.parse(bodyText);
      } catch {
        return { ...base, skip: "golden-not-json", path: spec.path, method: spec.method, status: probe.status };
      }
      const relGolden = join("wisp-api-goldens", goldenFileName(spec.method, spec.path));
      writeFileSync(join(wispFixture, relGolden), `${JSON.stringify(golden, null, 2)}\n`, "utf8");
      pilotRoutes.push({
        method: spec.method,
        path: spec.path,
        backendSource: `backend-services/routes/${resourceFromSlug(slugFromApiId(spec.entry.id))}`,
        goldenPath: relGolden,
        replayOk: null,
        capturedAt: new Date().toISOString(),
      });
    }

    const applied = applyWispApiGoldenHandlers({ includeTenantsPilot: false });
    if (!applied.ok) return { ...base, skip: "apply-handlers-failed", applied, baseUrl, source };

    const pilotManifest = {
      kind: "chrysalis.wisp.api-trace-pilot",
      schemaVersion: 1,
      status: "captured",
      source,
      mode: "all-routes",
      pilotRoutes,
      tracesRoot: "wisp-api-pilot-traces",
      goldensDir: "wisp-api-goldens",
      capturePlaybook: "docs/WISP-PRODUCTION-COMPLETION-PROGRAM.md#trace-capture-playbook",
      generatedAt: new Date().toISOString(),
    };
    writeFileSync(pilotManifestPath, `${JSON.stringify(pilotManifest, null, 2)}\n`, "utf8");

    return {
      ...base,
      ok: true,
      baseUrl,
      source,
      traceCount: recordReport.traceCount ?? traceFiles.length,
      goldenCount: pilotRoutes.length,
      applied,
    };
  } finally {
    if (server?.child) await stopServer(server.child);
  }
}

/**
 * @param {object} [opts]
 * @param {string} [opts.liveBaseUrl]
 */
export async function runWispApiTraceCapture(opts = {}) {
  if (opts.allRoutes === true) return runWispApiTraceCaptureAll(opts);
  const base = {
    kind: WISP_API_TRACE_CAPTURE_KIND,
    schemaVersion: 1,
    ok: false,
    route: PILOT_ROUTE,
  };

  let baseUrl = opts.liveBaseUrl?.replace(/\/$/, "") ?? "";
  let server = null;
  let source = "oracle-fixture";

  if (!baseUrl) {
    if (!existsSync(serveScript)) return { ...base, skip: "missing-oracle-serve" };
    if (!ensureOracleDeps()) return { ...base, skip: "oracle-npm-install-failed" };
    server = await startOracleServer();
    baseUrl = `http://${server.host}:${server.port}`;
  } else {
    source = "live-backend";
  }

  try {
    mkdirSync(tracesRoot, { recursive: true });
    const record = runStep(recordScript, [
      "--base-url",
      baseUrl,
      "--corpus-dir",
      tracesRoot,
      "--routes",
      `${PILOT_ROUTE.method} ${PILOT_ROUTE.path}`,
    ]);
    if (!record.ok) {
      return { ...base, skip: "record-failed", detail: record.stderr?.slice(0, 400), baseUrl, source };
    }
    const recordReport = parseStdoutJson(record.stdout);
    const day = new Date().toISOString().slice(0, 10);
    const traceFiles = existsSync(join(tracesRoot, day))
      ? readdirSync(join(tracesRoot, day)).filter((f) => f.endsWith(".ndjson"))
      : [];
    const traceRel =
      traceFiles.length > 0 ? `wisp-api-pilot-traces/${day}/${traceFiles[0]}` : null;

    const probe = await fetch(`${baseUrl}${PILOT_ROUTE.path}`, { signal: AbortSignal.timeout(15_000) });
    const bodyText = await probe.text();
    let golden;
    try {
      golden = JSON.parse(bodyText);
    } catch {
      return { ...base, skip: "golden-not-json", baseUrl, source, status: probe.status };
    }
    writeFileSync(goldenPath, `${JSON.stringify(golden, null, 2)}\n`, "utf8");

    const applied = applyWispApiPilotHandler({ goldenPath });
    if (!applied.ok) return { ...base, skip: "apply-handler-failed", applied, baseUrl, source };

    const pilotManifest = {
      kind: "chrysalis.wisp.api-trace-pilot",
      schemaVersion: 1,
      status: "captured",
      source,
      pilotRoutes: [
        {
          method: PILOT_ROUTE.method,
          path: PILOT_ROUTE.path,
          backendSource: "backend-services/routes/tenants",
          traceCorpus: traceRel,
          goldenPath: "wisp-api-tenants-get.golden.json",
          replayOk: null,
          capturedAt: new Date().toISOString(),
        },
      ],
      tracesRoot: "wisp-api-pilot-traces",
      capturePlaybook: "docs/WISP-PRODUCTION-POC-PROGRAM.md#trace-capture-playbook",
      generatedAt: new Date().toISOString(),
    };
    writeFileSync(pilotManifestPath, `${JSON.stringify(pilotManifest, null, 2)}\n`, "utf8");

    return {
      ...base,
      ok: true,
      baseUrl,
      source,
      traceCount: recordReport.traceCount ?? null,
      traceRel,
      goldenPath,
      applied,
    };
  } finally {
    if (server?.child) await stopServer(server.child);
  }
}

async function main() {
  let liveBaseUrl = "";
  let allRoutes = false;
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === "--live-base-url" && process.argv[i + 1]) liveBaseUrl = process.argv[++i];
    else if (process.argv[i] === "--all") allRoutes = true;
  }
  const r = await runWispApiTraceCapture({ liveBaseUrl: liveBaseUrl || undefined, allRoutes });
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("wisp-cwl-api-trace-capture")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
