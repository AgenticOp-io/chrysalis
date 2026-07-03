#!/usr/bin/env node
/** Phase 41b.2 — oracle-python trace parity on gold fixture (G8722). */
import { readFileSync } from "node:fs";
import { mkdtempSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { resolveHubPython } from "./shared.mjs";

export const PYTHON_ORACLE_TRACE_SMOKE_KIND = "chrysalis.python-oracle-trace-smoke";
export const PYTHON_ORACLE_TRACE_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixtureRel = "fixtures/hub-gold-python-literal";

/** G8722 — oracle-python records gold routes; @chrysalis/oracle parseTraceFile accepts NDJSON. */
export async function runPythonOracleTraceB2Gate() {
  const fixture = join(scriptRoot, fixtureRel);
  const routesSpec = join(fixture, "chrysalis.oracle-routes.json");
  const py = resolveHubPython();
  if (spawnSync(py, ["-c", "import ast"], { encoding: "utf8" }).status !== 0) {
    return { ok: false, skip: "python-not-on-path" };
  }

  let routeCount = 0;
  try {
    const spec = JSON.parse(readFileSync(routesSpec, "utf8"));
    routeCount = Array.isArray(spec.routes) ? spec.routes.length : 0;
  } catch {
    return { ok: false, skip: "missing-oracle-routes-spec" };
  }

  const tmp = mkdtempSync(join(tmpdir(), "chrysalis-py-oracle-"));
  const out = join(tmp, "trace.ndjson");
  const recordScript = join(scriptRoot, "packages/oracle-python/record_fixture_routes.py");
  const rec = spawnSync(py, [recordScript, out, routesSpec], {
    cwd: scriptRoot,
    encoding: "utf8",
  });
  if (rec.status !== 0) {
    rmSync(tmp, { recursive: true, force: true });
    return { ok: false, skip: "record-failed", stderr: rec.stderr?.slice(0, 300) };
  }

  let parseOk = false;
  let eventCount = 0;
  try {
    const oracle = await import(pathToFileURL(join(scriptRoot, "packages/oracle/dist/index.js")).href);
    const trace = oracle.parseTraceFile(out);
    eventCount = trace.events?.length ?? 0;
    parseOk = eventCount >= routeCount * 2;
  } catch (e) {
    rmSync(tmp, { recursive: true, force: true });
    return {
      ok: false,
      skip: "parse-trace-failed",
      detail: e instanceof Error ? e.message : String(e),
    };
  }

  rmSync(tmp, { recursive: true, force: true });
  return {
    ok: parseOk && routeCount >= 2,
    routeCount,
    eventCount,
    parseOk,
    fixtureRel,
  };
}

export async function runPythonOracleTraceSmoke() {
  const progress = createSmokeProgress("python-oracle-trace");
  const t0 = progress.start("Python oracle trace (G8722)");
  const gate = await runPythonOracleTraceB2Gate();
  progress.end("Python oracle trace (G8722)", gate.ok === true, t0);
  return {
    kind: PYTHON_ORACLE_TRACE_SMOKE_KIND,
    schemaVersion: PYTHON_ORACLE_TRACE_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runPythonOracleTraceSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-python-oracle-trace-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
