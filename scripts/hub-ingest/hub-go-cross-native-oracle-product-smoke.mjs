#!/usr/bin/env node
/** Phase 41d.13 — Go literal → cross-native oracle product (G8772). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { HUB_GOLD_SUITES } from "./hub-gold-manifest.mjs";
import { runGoldVerifySuite } from "./hub-gold-verify.mjs";
import { runTraceReplaySuite } from "./hub-gold-trace-replay.mjs";
import { runFullMatrixOracleProgressGate } from "./hub-full-matrix-oracle-progress-smoke.mjs";
import { resolveHubRuby } from "./hub-gold-ruby-fetch.mjs";
import { resolveHubDotnet } from "./hub-gold-csharp-fetch.mjs";

export const GO_CROSS_NATIVE_ORACLE_PRODUCT_SMOKE_KIND =
  "chrysalis.go-cross-native-oracle-product-smoke";
export const GO_CROSS_NATIVE_ORACLE_PRODUCT_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const GO_CROSS_NATIVE_SUITES = [
  { id: "go-literal-python-native", skip: null },
  { id: "go-literal-java-native", skip: null },
  { id: "go-literal-ruby-native", skip: "ruby-not-on-path", resolve: resolveHubRuby },
  { id: "go-literal-csharp-native", skip: "dotnet-not-on-path", resolve: resolveHubDotnet },
];

/**
 * @param {{ id: string, skip?: string | null, resolve?: () => string | null }} spec
 */
async function runGoCrossNativeGate(spec) {
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

/** G8772 — go literal gold → python/java/ruby/csharp native trace oracle. */
export async function runGoCrossNativeOracleProductGate() {
  const suites = {};
  let allOk = true;
  for (const spec of GO_CROSS_NATIVE_SUITES) {
    const r = await runGoCrossNativeGate(spec);
    suites[spec.id] = r;
    const ok = r.ok === true || (spec.skip && r.skip === spec.skip);
    if (!ok) allOk = false;
  }
  const matrixProgress = runFullMatrixOracleProgressGate();
  const goCrossNativePairs = (matrixProgress.oracleProductPairs ?? []).filter(
    (p) =>
      p.origin === "go" &&
      ["python", "java", "ruby", "csharp"].includes(p.output),
  );
  return {
    ok: allOk,
    suites,
    goCrossNativeOracleProductPairs: goCrossNativePairs.length,
    matrixOracleProductCount: matrixProgress.oracleProductCount,
  };
}

export async function runGoCrossNativeOracleProductSmoke() {
  const progress = createSmokeProgress("go-cross-native-oracle-product");
  const t0 = progress.start("Go→cross-native oracle product (G8772)");
  const gate = await runGoCrossNativeOracleProductGate();
  progress.end("Go→cross-native oracle product (G8772)", gate.ok === true, t0);
  return {
    kind: GO_CROSS_NATIVE_ORACLE_PRODUCT_SMOKE_KIND,
    schemaVersion: GO_CROSS_NATIVE_ORACLE_PRODUCT_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runGoCrossNativeOracleProductSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-go-cross-native-oracle-product-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
