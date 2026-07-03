#!/usr/bin/env node
/** Phase 41b.1 — @chrysalis/python-bridge + ingest hub Python adapter (G8721). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { exportPythonHubWebir } from "./hub-python-hub-webir.mjs";

export const PYTHON_NATIVE_INGEST_SMOKE_KIND = "chrysalis.python-native-ingest-smoke";
export const PYTHON_NATIVE_INGEST_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixtureRel = "fixtures/hub-gold-python-literal";

/** G8721 — python-bridge parse + @chrysalis/ingest adapter exports hole-free WebIR. */
export async function runPythonNativeIngestB1Gate() {
  const fixture = join(scriptRoot, fixtureRel);
  const bridge = await import(pathToFileURL(join(scriptRoot, "packages/python-bridge/dist/index.js")).href);
  const ingest = await import(pathToFileURL(join(scriptRoot, "packages/ingest/dist/index.js")).href);

  const parsed = bridge.parseSourceSync(
    'from flask import Flask\napp = Flask(__name__)\n@app.get("/x")\ndef x():\n    return 1\n',
  );
  const bridgeOk =
    parsed.schemaVersion === bridge.SCHEMA_VERSION &&
    parsed.routes.length === 1 &&
    parsed.routes[0]?.path === "/x";

  const adapterOk =
    typeof ingest.ingestPythonHubSource === "function" &&
    typeof ingest.parsePythonRoutes === "function" &&
    typeof ingest.liftPythonFileToWebir === "function";

  const exportResult = await exportPythonHubWebir(fixture);
  const exportOk = exportResult.ok === true && (exportResult.routeCount ?? 0) >= 2;

  return {
    ok: bridgeOk && adapterOk && exportOk,
    bridgeOk,
    adapterOk,
    exportOk,
    routeCount: exportResult.routeCount ?? 0,
    holeCount: exportResult.holeCount ?? 1,
    usedIngestAdapter: exportResult.usedIngestAdapter === true,
    fixtureRel,
  };
}

export async function runPythonNativeIngestSmoke() {
  const progress = createSmokeProgress("python-native-ingest");
  const t0 = progress.start("Python native ingest (G8721)");
  const gate = await runPythonNativeIngestB1Gate();
  progress.end("Python native ingest (G8721)", gate.ok === true, t0);
  return {
    kind: PYTHON_NATIVE_INGEST_SMOKE_KIND,
    schemaVersion: PYTHON_NATIVE_INGEST_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runPythonNativeIngestSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-python-native-ingest-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
