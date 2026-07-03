#!/usr/bin/env node
/** Phase 41d.16 — TypeScript literal → cross-native oracle product (G8775). */
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

export const TYPESCRIPT_CROSS_NATIVE_ORACLE_PRODUCT_SMOKE_KIND =
  "chrysalis.typescript-cross-native-oracle-product-smoke";
export const TYPESCRIPT_CROSS_NATIVE_ORACLE_PRODUCT_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const TYPESCRIPT_CROSS_NATIVE_SUITES = [
  { id: "ts-literal-python-native", skip: null },
  { id: "ts-literal-java-native", skip: null },
  { id: "ts-literal-go-native", skip: "go-not-on-path", resolve: resolveHubGo },
  { id: "ts-literal-ruby-native", skip: "ruby-not-on-path", resolve: resolveHubRuby },
  { id: "ts-literal-csharp-native", skip: "dotnet-not-on-path", resolve: resolveHubDotnet },
];

/**
 * @param {{ id: string, skip?: string | null, resolve?: () => string | null }} spec
 */
async function runTypescriptCrossNativeGate(spec) {
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

/** G8775 — typescript literal gold → python/java/go/ruby/csharp native trace oracle. */
export async function runTypescriptCrossNativeOracleProductGate() {
  const suites = {};
  let allOk = true;
  for (const spec of TYPESCRIPT_CROSS_NATIVE_SUITES) {
    const r = await runTypescriptCrossNativeGate(spec);
    suites[spec.id] = r;
    const ok = r.ok === true || (spec.skip && r.skip === spec.skip);
    if (!ok) allOk = false;
  }
  const matrixProgress = runFullMatrixOracleProgressGate();
  const typescriptCrossNativePairs = (matrixProgress.oracleProductPairs ?? []).filter(
    (p) =>
      p.origin === "typescript" &&
      ["python", "java", "go", "ruby", "csharp"].includes(p.output),
  );
  return {
    ok: allOk,
    suites,
    typescriptCrossNativeOracleProductPairs: typescriptCrossNativePairs.length,
    matrixOracleProductCount: matrixProgress.oracleProductCount,
  };
}

export async function runTypescriptCrossNativeOracleProductSmoke() {
  const progress = createSmokeProgress("typescript-cross-native-oracle-product");
  const t0 = progress.start("TypeScript→cross-native oracle product (G8775)");
  const gate = await runTypescriptCrossNativeOracleProductGate();
  progress.end("TypeScript→cross-native oracle product (G8775)", gate.ok === true, t0);
  return {
    kind: TYPESCRIPT_CROSS_NATIVE_ORACLE_PRODUCT_SMOKE_KIND,
    schemaVersion: TYPESCRIPT_CROSS_NATIVE_ORACLE_PRODUCT_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runTypescriptCrossNativeOracleProductSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-typescript-cross-native-oracle-product-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
