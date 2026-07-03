#!/usr/bin/env node
/** Phase 41d.10 — Express flagship → native oracle product (G8769). */
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

export const EXPRESS_NATIVE_ORACLE_PRODUCT_SMOKE_KIND = "chrysalis.express-native-oracle-product-smoke";
export const EXPRESS_NATIVE_ORACLE_PRODUCT_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const EXPRESS_NATIVE_SUITES = [
  { id: "express-flagship-python-native", skip: null },
  { id: "express-flagship-java-native", skip: null },
  { id: "express-flagship-go-native", skip: "go-not-on-path", resolve: resolveHubGo },
  { id: "express-flagship-ruby-native", skip: "ruby-not-on-path", resolve: resolveHubRuby },
  { id: "express-flagship-csharp-native", skip: "dotnet-not-on-path", resolve: resolveHubDotnet },
];

/**
 * @param {{ id: string, skip?: string | null, resolve?: () => string | null }} spec
 */
async function runExpressNativeGate(spec) {
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

/** G8769 — javascript express flagship → native emit trace oracle on all core native outputs. */
export async function runExpressNativeOracleProductGate() {
  const suites = {};
  let allOk = true;
  for (const spec of EXPRESS_NATIVE_SUITES) {
    const r = await runExpressNativeGate(spec);
    suites[spec.id] = r;
    const ok = r.ok === true || (spec.skip && r.skip === spec.skip);
    if (!ok) allOk = false;
  }
  const matrixProgress = runFullMatrixOracleProgressGate();
  const jsNativePairs = (matrixProgress.oracleProductPairs ?? []).filter(
    (p) => p.origin === "javascript" && ["python", "java", "go", "ruby", "csharp"].includes(p.output),
  );
  return {
    ok: allOk,
    suites,
    javascriptNativeOracleProductPairs: jsNativePairs.length,
    matrixOracleProductCount: matrixProgress.oracleProductCount,
  };
}

export async function runExpressNativeOracleProductSmoke() {
  const progress = createSmokeProgress("express-native-oracle-product");
  const t0 = progress.start("Express→native oracle product (G8769)");
  const gate = await runExpressNativeOracleProductGate();
  progress.end("Express→native oracle product (G8769)", gate.ok === true, t0);
  return {
    kind: EXPRESS_NATIVE_ORACLE_PRODUCT_SMOKE_KIND,
    schemaVersion: EXPRESS_NATIVE_ORACLE_PRODUCT_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runExpressNativeOracleProductSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-express-native-oracle-product-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
