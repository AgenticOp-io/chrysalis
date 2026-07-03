#!/usr/bin/env node
/** Phase 41f — Remaining matrix oracle product pairs close (G8778). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { HUB_GOLD_SUITES } from "./hub-gold-manifest.mjs";
import { runGoldVerifySuite } from "./hub-gold-verify.mjs";
import { runTraceReplaySuite } from "./hub-gold-trace-replay.mjs";
import { runFullMatrixOracleProgressGate } from "./hub-full-matrix-oracle-progress-smoke.mjs";
import { resolveHubGo } from "./hub-gold-go-fetch.mjs";
import { resolveHubRuby } from "./hub-gold-ruby-fetch.mjs";
import { resolveHubDotnet } from "./hub-gold-csharp-fetch.mjs";
import { resolveHubPhp } from "./hub-gold-php-fetch.mjs";

export const MATRIX_ORACLE_REMAINING_SMOKE_KIND = "chrysalis.matrix-oracle-remaining-smoke";
export const MATRIX_ORACLE_REMAINING_SMOKE_SCHEMA_VERSION = 1;

const REMAINING_SUITE_SPECS = [
  { id: "java-literal-cwl", skip: null },
  { id: "python-literal-cwl", skip: null },
  { id: "go-literal-cwl", skip: "go-not-on-path", resolve: resolveHubGo },
  { id: "ruby-literal-cwl", skip: "ruby-not-on-path", resolve: resolveHubRuby },
  { id: "csharp-literal-cwl", skip: "dotnet-not-on-path", resolve: resolveHubDotnet },
  { id: "js-literal-cwl", skip: null },
  { id: "ts-literal-cwl", skip: null },
  { id: "plain-php-flagship-cwl", skip: "php-not-on-path", resolve: resolveHubPhp },
  { id: "java-literal-php-native", skip: "php-not-on-path", resolve: resolveHubPhp },
  { id: "python-literal-php-native", skip: "php-not-on-path", resolve: resolveHubPhp },
  { id: "go-literal-php-native", skip: "go-or-php-not-on-path", resolve: () => resolveHubGo() && resolveHubPhp() },
  { id: "ruby-literal-php-native", skip: "ruby-or-php-not-on-path", resolve: () => resolveHubRuby() && resolveHubPhp() },
  { id: "csharp-literal-php-native", skip: "dotnet-or-php-not-on-path", resolve: () => resolveHubDotnet() && resolveHubPhp() },
  { id: "cwl-gold-php-native", skip: "php-not-on-path", resolve: resolveHubPhp },
  { id: "js-literal-php-native", skip: "php-not-on-path", resolve: resolveHubPhp },
  { id: "ts-literal-php-native", skip: "php-not-on-path", resolve: resolveHubPhp },
  { id: "plain-php-flagship-hono", skip: "php-not-on-path", resolve: resolveHubPhp },
];

/**
 * @param {{ id: string, skip?: string | null, resolve?: () => string | null | false }} spec
 */
async function runRemainingSuiteGate(spec) {
  if (spec.resolve && !spec.resolve()) {
    return { ok: false, skip: spec.skip, suiteId: spec.id };
  }
  const suite = HUB_GOLD_SUITES.find((s) => s.id === spec.id);
  if (!suite) {
    return { ok: false, skip: "missing-suite", suiteId: spec.id };
  }
  const verify = await runGoldVerifySuite(suite);
  let replayOk = false;
  let replayDetail = null;
  try {
    const replay = await runTraceReplaySuite(suite);
    replayOk = replay.ok === true;
    replayDetail = {
      correctness: replay.correctness,
      routeCount: replay.routeCount,
      traceCount: replay.traceCount,
    };
  } catch (e) {
    replayDetail = { error: e instanceof Error ? e.message : String(e) };
  }
  return {
    ok: verify.ok === true && replayOk,
    verifyOk: verify.ok === true,
    replayOk,
    replayDetail,
    suiteId: spec.id,
  };
}

/** G8778 — close final CWL + PHP matrix oracle product lanes. */
export async function runMatrixOracleRemainingGate() {
  const suites = {};
  let allOk = true;
  for (const spec of REMAINING_SUITE_SPECS) {
    const r = await runRemainingSuiteGate(spec);
    suites[spec.id] = r;
    const ok = r.ok === true || (spec.skip && r.skip === spec.skip);
    if (!ok) allOk = false;
  }
  const matrixProgress = runFullMatrixOracleProgressGate();
  return {
    ok: allOk && matrixProgress.belowTarget === 0 && matrixProgress.programComplete === true,
    suites,
    matrixProgress: {
      ok: matrixProgress.ok === true,
      programComplete: matrixProgress.programComplete,
      belowTarget: matrixProgress.belowTarget,
      oracleProductCount: matrixProgress.oracleProductCount,
      expectedPairCount: matrixProgress.expectedPairCount,
    },
  };
}

export async function runMatrixOracleRemainingSmoke() {
  const progress = createSmokeProgress("matrix-oracle-remaining");
  const t0 = progress.start("Matrix oracle remaining pairs (G8778)");
  const gate = await runMatrixOracleRemainingGate();
  progress.end("Matrix oracle remaining pairs (G8778)", gate.ok === true, t0);
  return {
    kind: MATRIX_ORACLE_REMAINING_SMOKE_KIND,
    schemaVersion: MATRIX_ORACLE_REMAINING_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runMatrixOracleRemainingSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-matrix-oracle-remaining-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
