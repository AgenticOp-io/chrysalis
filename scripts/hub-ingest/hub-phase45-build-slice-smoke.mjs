#!/usr/bin/env node
/** Phase 45 product supremacy build slice — entry + census + showcase (G9180). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runPhase45ProgramDocGate } from "./hub-phase45-program-entry-smoke.mjs";
import { runExtendedMatrixOracleProgressGate } from "./hub-extended-matrix-oracle-progress-smoke.mjs";
import { runPhase45WispShowcaseGate } from "./hub-phase45-wisp-showcase-smoke.mjs";
import { runExtendedMatrixOracleWave4Gate } from "./hub-extended-matrix-oracle-wave4-smoke.mjs";

export const PHASE45_BUILD_SLICE_KIND = "chrysalis.phase45-build-slice-smoke";
export const PHASE45_BUILD_SLICE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runPhase45BuildSliceGate(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const program = runPhase45ProgramDocGate();
  const census = runExtendedMatrixOracleProgressGate();
  const wave4 = runExtendedMatrixOracleWave4Gate();
  const wisp = await runPhase45WispShowcaseGate({ ...opts, repoRoot });
  const ok = program.ok === true && census.ok === true && wave4.ok === true && wisp.ok === true;
  return {
    kind: PHASE45_BUILD_SLICE_KIND,
    schemaVersion: PHASE45_BUILD_SLICE_SCHEMA_VERSION,
    ok,
    program,
    census,
    wave4,
    wisp,
    generatedAt: new Date().toISOString(),
  };
}

export async function runPhase45BuildSliceSmoke(opts = {}) {
  const progress = createSmokeProgress("phase45-build-slice");
  const t0 = progress.start("Phase 45 product supremacy build slice (G9180)");
  const gate = await runPhase45BuildSliceGate(opts);
  progress.end("Phase 45 product supremacy build slice (G9180)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runPhase45BuildSliceSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-phase45-build-slice-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
