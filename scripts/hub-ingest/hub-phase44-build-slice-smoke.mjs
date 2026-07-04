#!/usr/bin/env node
/** Phase 44 build slice — G9001 + G9010 + G9051 + G9110 + Phase 41/43 regression. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runPhase44ProgramDocGate } from "./hub-phase44-program-entry-smoke.mjs";
import { runExtendedMatrixOracleProgressGate } from "./hub-extended-matrix-oracle-progress-smoke.mjs";
import { runExtendedMatrixOracleWave1Gate } from "./hub-extended-matrix-oracle-wave1-smoke.mjs";
import { runLlmConvertHoleClosureGate } from "./hub-llm-convert-hole-closure-smoke.mjs";
import { runHorizonCTrainLoopGate } from "./hub-horizon-c-train-loop-smoke.mjs";
import { runLlmConvertFullClosedRegressionGate } from "./hub-llm-convert-full-closed-regression-smoke.mjs";
import { runFullMatrixOracleProgressGate } from "./hub-full-matrix-oracle-progress-smoke.mjs";

export const PHASE44_BUILD_SLICE_KIND = "chrysalis.phase44-build-slice-smoke";
export const PHASE44_BUILD_SLICE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runPhase44BuildSliceGate(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const program = runPhase44ProgramDocGate();
  const census = runExtendedMatrixOracleProgressGate();
  const wave1 = runExtendedMatrixOracleWave1Gate();
  const holeClosure = await runLlmConvertHoleClosureGate({ repoRoot });
  const horizonC = await runHorizonCTrainLoopGate({ repoRoot });
  const phase43 = await runLlmConvertFullClosedRegressionGate({ repoRoot });
  const phase41 = runFullMatrixOracleProgressGate();
  const ok =
    program.ok &&
    census.ok &&
    wave1.ok &&
    holeClosure.ok &&
    horizonC.ok &&
    phase43.ok &&
    phase41.programComplete === true;
  return {
    kind: PHASE44_BUILD_SLICE_KIND,
    schemaVersion: PHASE44_BUILD_SLICE_SCHEMA_VERSION,
    ok,
    program,
    census,
    wave1,
    holeClosure,
    horizonC,
    phase43Regression: phase43,
    phase41Regression: phase41,
    generatedAt: new Date().toISOString(),
  };
}

export async function runPhase44BuildSliceSmoke(opts = {}) {
  const progress = createSmokeProgress("phase44-build-slice");
  const t0 = progress.start("Phase 44 build slice (G9000–G9110)");
  const gate = await runPhase44BuildSliceGate(opts);
  progress.end("Phase 44 build slice (G9000–G9110)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runPhase44BuildSliceSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-phase44-build-slice-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
