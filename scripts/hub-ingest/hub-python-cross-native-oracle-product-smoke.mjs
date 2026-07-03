#!/usr/bin/env node
/** Phase 41d.11 — Python literal → cross-native oracle product (G8770). */
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

export const PYTHON_CROSS_NATIVE_ORACLE_PRODUCT_SMOKE_KIND =
  "chrysalis.python-cross-native-oracle-product-smoke";
export const PYTHON_CROSS_NATIVE_ORACLE_PRODUCT_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const PYTHON_CROSS_NATIVE_SUITES = [
  { id: "python-literal-java-native", skip: null },
  { id: "python-literal-go-native", skip: "go-not-on-path", resolve: resolveHubGo },
  { id: "python-literal-ruby-native", skip: "ruby-not-on-path", resolve: resolveHubRuby },
  { id: "python-literal-csharp-native", skip: "dotnet-not-on-path", resolve: resolveHubDotnet },
];

/**
 * @param {{ id: string, skip?: string | null, resolve?: () => string | null }} spec
 */
async function runPythonCrossNativeGate(spec) {
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

/** G8770 — python literal gold → java/go/ruby/csharp native trace oracle. */
export async function runPythonCrossNativeOracleProductGate() {
  const suites = {};
  let allOk = true;
  for (const spec of PYTHON_CROSS_NATIVE_SUITES) {
    const r = await runPythonCrossNativeGate(spec);
    suites[spec.id] = r;
    const ok = r.ok === true || (spec.skip && r.skip === spec.skip);
    if (!ok) allOk = false;
  }
  const matrixProgress = runFullMatrixOracleProgressGate();
  const pythonCrossNativePairs = (matrixProgress.oracleProductPairs ?? []).filter(
    (p) =>
      p.origin === "python" &&
      ["java", "go", "ruby", "csharp"].includes(p.output),
  );
  return {
    ok: allOk,
    suites,
    pythonCrossNativeOracleProductPairs: pythonCrossNativePairs.length,
    matrixOracleProductCount: matrixProgress.oracleProductCount,
  };
}

export async function runPythonCrossNativeOracleProductSmoke() {
  const progress = createSmokeProgress("python-cross-native-oracle-product");
  const t0 = progress.start("Python→cross-native oracle product (G8770)");
  const gate = await runPythonCrossNativeOracleProductGate();
  progress.end("Python→cross-native oracle product (G8770)", gate.ok === true, t0);
  return {
    kind: PYTHON_CROSS_NATIVE_ORACLE_PRODUCT_SMOKE_KIND,
    schemaVersion: PYTHON_CROSS_NATIVE_ORACLE_PRODUCT_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runPythonCrossNativeOracleProductSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-python-cross-native-oracle-product-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
