#!/usr/bin/env node
/** Combined build slice: Phase 41b Python native ingest + oracle (G8720). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runPythonNativeIngestB1Gate } from "./hub-python-native-ingest-smoke.mjs";
import { runPythonOracleTraceB2Gate } from "./hub-python-oracle-trace-smoke.mjs";
import { runPythonOracleProductB3Gate } from "./hub-python-oracle-product-smoke.mjs";
import { runPythonSemanticReqResB4Gate } from "./hub-python-semantic-req-res-smoke.mjs";
import { runPythonSemanticSqlB5Gate } from "./hub-python-semantic-sql-smoke.mjs";
import { runFullMatrixOracleProgressGate } from "./hub-full-matrix-oracle-progress-smoke.mjs";

export const PHASE41B_PYTHON_BUILD_SLICE_SMOKE_KIND = "chrysalis.phase41b-python-build-slice-smoke";
export const PHASE41B_PYTHON_BUILD_SLICE_SMOKE_SCHEMA_VERSION = 2;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runPhase41bPythonBuildSliceGate(opts = {}) {
  const nativeIngest = await runPythonNativeIngestB1Gate();
  const oracleTrace = await runPythonOracleTraceB2Gate();
  const oracleProduct = await runPythonOracleProductB3Gate();
  const reqRes = await runPythonSemanticReqResB4Gate();
  const sql = await runPythonSemanticSqlB5Gate();
  const matrixProgress = runFullMatrixOracleProgressGate();

  const ok =
    nativeIngest.ok === true &&
    oracleTrace.ok === true &&
    oracleProduct.ok === true &&
    reqRes.ok === true &&
    sql.ok === true &&
    matrixProgress.ok === true;

  return {
    kind: PHASE41B_PYTHON_BUILD_SLICE_SMOKE_KIND,
    schemaVersion: PHASE41B_PYTHON_BUILD_SLICE_SMOKE_SCHEMA_VERSION,
    ok,
    nativeIngest: { ok: nativeIngest.ok === true, gate: "G8721", ...nativeIngest },
    oracleTrace: { ok: oracleTrace.ok === true, gate: "G8722", ...oracleTrace },
    oracleProduct: { ok: oracleProduct.ok === true, gate: "G8723", ...oracleProduct },
    pythonReqRes: { ok: reqRes.ok === true, gate: "G8724", ...reqRes },
    pythonSql: { ok: sql.ok === true, gate: "G8725", ...sql },
    matrixProgress: {
      ok: matrixProgress.ok === true,
      gate: "G8701",
      programComplete: matrixProgress.programComplete,
      belowTarget: matrixProgress.belowTarget,
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function runPhase41bPythonBuildSliceSmoke(opts = {}) {
  const progress = createSmokeProgress("phase41b-python-build-slice");
  const t0 = progress.start("Phase 41b Python build slice");
  const gate = await runPhase41bPythonBuildSliceGate(opts);
  progress.end("Phase 41b Python build slice", gate.ok === true, t0);
  return {
    kind: PHASE41B_PYTHON_BUILD_SLICE_SMOKE_KIND,
    schemaVersion: PHASE41B_PYTHON_BUILD_SLICE_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
  };
}

async function main() {
  const r = await runPhase41bPythonBuildSliceSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-phase41b-python-build-slice-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
