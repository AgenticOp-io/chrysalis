#!/usr/bin/env node
/** Phase 41e — CWL executable effects outbound composite (G8750). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runCwlEffectsExecutableGate } from "./hub-cwl-effects-executable-smoke.mjs";
import { runGoldVerifySuite } from "./hub-gold-verify.mjs";
import { runTraceReplaySuite } from "./hub-gold-trace-replay.mjs";
import { runFullMatrixOracleProgressGate } from "./hub-full-matrix-oracle-progress-smoke.mjs";
import { runCwlPatternLiteralCwlBatchSmoke } from "./hub-cwl-pattern-literal-cwl-batch-smoke.mjs";
import { runCwlCrossNativeOracleProductGate } from "./hub-cwl-cross-native-oracle-product-smoke.mjs";
import { runMatrixOracleRemainingGate } from "./hub-matrix-oracle-remaining-smoke.mjs";

export const PHASE41E_CWL_EFFECTS_SMOKE_KIND = "chrysalis.phase41e-cwl-effects-smoke";
export const PHASE41E_CWL_EFFECTS_SMOKE_SCHEMA_VERSION = 3;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const CWL_ORACLE_REPLAY = ["cwl-gold-hono", "python-literal-cwl", "java-literal-cwl"];

/** G8752 — pattern/vue literal → CWL structural gold batch. */
export function runCwlOutboundStructuralG8752Gate() {
  const batch = runCwlPatternLiteralCwlBatchSmoke();
  return { ok: batch.ok === true, batch };
}

/** G8753 — CWL / lifted CWL oracle product trace replay subset. */
export async function runCwlOutboundOracleG8753Gate() {
  const { HUB_GOLD_SUITES } = await import("./hub-gold-manifest.mjs");
  const suites = HUB_GOLD_SUITES.filter((s) => CWL_ORACLE_REPLAY.includes(s.id));
  const results = {};
  let allOk = true;
  for (const suite of suites) {
    const verify = await runGoldVerifySuite(suite);
    let replayOk = true;
    if (suite.traceReplay) {
      try {
        const replay = await runTraceReplaySuite(suite);
        replayOk = replay.ok === true;
      } catch {
        replayOk = false;
      }
    }
    results[suite.id] = { verifyOk: verify.ok === true, replayOk };
    if (!verify.ok || !replayOk) allOk = false;
  }
  return { ok: allOk, suites: results };
}

export async function runPhase41eCwlEffectsGate() {
  const g8751 = await runCwlEffectsExecutableGate();
  const g8752 = runCwlOutboundStructuralG8752Gate();
  const g8753 = await runCwlOutboundOracleG8753Gate();
  const g8777 = await runCwlCrossNativeOracleProductGate();
  const g8778 = await runMatrixOracleRemainingGate();
  const matrixProgress = runFullMatrixOracleProgressGate();
  const g8778Ok = g8778.ok === true;
  const ok =
    g8751.ok === true &&
    g8752.ok === true &&
    g8753.ok === true &&
    g8777.ok === true &&
    g8778Ok &&
    matrixProgress.ok === true;
  return {
    kind: PHASE41E_CWL_EFFECTS_SMOKE_KIND,
    schemaVersion: PHASE41E_CWL_EFFECTS_SMOKE_SCHEMA_VERSION,
    ok,
    effectsExecutable: { ok: g8751.ok === true, gate: "G8751", ...g8751 },
    cwlStructural: { ok: g8752.ok === true, gate: "G8752", ...g8752 },
    cwlOracleProduct: { ok: g8753.ok === true, gate: "G8753", ...g8753 },
    cwlCrossNativeOracleProduct: { ok: g8777.ok === true, gate: "G8777", ...g8777 },
    matrixOracleRemaining: { ok: g8778Ok, gate: "G8778", ...g8778 },
    matrixProgress: {
      ok: matrixProgress.ok === true,
      gate: "G8701",
      programComplete: matrixProgress.programComplete,
      belowTarget: matrixProgress.belowTarget,
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function runPhase41eCwlEffectsSmoke() {
  const progress = createSmokeProgress("phase41e-cwl-effects");
  const t0 = progress.start("Phase 41e CWL effects outbound");
  const gate = await runPhase41eCwlEffectsGate();
  progress.end("Phase 41e CWL effects outbound", gate.ok === true, t0);
  return { kind: PHASE41E_CWL_EFFECTS_SMOKE_KIND, schemaVersion: PHASE41E_CWL_EFFECTS_SMOKE_SCHEMA_VERSION, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runPhase41eCwlEffectsSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-phase41e-cwl-effects-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
