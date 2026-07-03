#!/usr/bin/env node
/** Phase 41d.9 — Native → native oracle product (G8768). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { HUB_GOLD_SUITES } from "./hub-gold-manifest.mjs";
import { runGoldVerifySuite } from "./hub-gold-verify.mjs";
import { runTraceReplaySuite } from "./hub-gold-trace-replay.mjs";
import { runFullMatrixOracleProgressGate } from "./hub-full-matrix-oracle-progress-smoke.mjs";
import { resolveHubGo } from "./hub-gold-go-fetch.mjs";
import { resolveHubRuby } from "./hub-gold-ruby-fetch.mjs";
import { resolveHubDotnet } from "./hub-gold-csharp-fetch.mjs";

export const NATIVE_ORACLE_PRODUCT_SMOKE_KIND = "chrysalis.native-oracle-product-smoke";
export const NATIVE_ORACLE_PRODUCT_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const NATIVE_NATIVE_SUITES = [
  { id: "python-native-python", skip: null },
  { id: "java-native-java", skip: null },
  { id: "go-native-go", skip: "go-not-on-path", resolve: resolveHubGo },
  { id: "ruby-native-ruby", skip: "ruby-not-on-path", resolve: resolveHubRuby },
  { id: "csharp-native-csharp", skip: "dotnet-not-on-path", resolve: resolveHubDotnet },
];

/**
 * @param {{ id: string, skip?: string | null, resolve?: () => string | null }} spec
 */
async function runNativeNativeOracleGate(spec) {
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

/** G8768 — literal native origins replay on same-language emit + probe. */
export async function runNativeOracleProductGate() {
  const suites = {};
  let allOk = true;
  for (const spec of NATIVE_NATIVE_SUITES) {
    const r = await runNativeNativeOracleGate(spec);
    suites[spec.id] = r;
    const ok = r.ok === true || (spec.skip && r.skip === spec.skip);
    if (!ok) allOk = false;
  }
  const matrixProgress = runFullMatrixOracleProgressGate();
  const nativeNativePairs = (matrixProgress.oracleProductPairs ?? []).filter(
    (p) => p.origin === p.output && ["python", "java", "go", "ruby", "csharp"].includes(p.origin),
  );
  return {
    ok: allOk,
    suites,
    nativeNativeOracleProductPairs: nativeNativePairs.length,
    matrixOracleProductCount: matrixProgress.oracleProductCount,
  };
}

export async function runNativeOracleProductSmoke() {
  const progress = createSmokeProgress("native-oracle-product");
  const t0 = progress.start("Native→native oracle product (G8768)");
  const gate = await runNativeOracleProductGate();
  progress.end("Native→native oracle product (G8768)", gate.ok === true, t0);
  return {
    kind: NATIVE_ORACLE_PRODUCT_SMOKE_KIND,
    schemaVersion: NATIVE_ORACLE_PRODUCT_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runNativeOracleProductSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-native-oracle-product-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
