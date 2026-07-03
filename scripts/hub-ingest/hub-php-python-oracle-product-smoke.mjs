#!/usr/bin/env node
/** Phase 41d.4 — PHP → Python native oracle product (G8763). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { HUB_GOLD_SUITES } from "./hub-gold-manifest.mjs";
import { runGoldVerifySuite } from "./hub-gold-verify.mjs";
import { runTraceReplaySuite } from "./hub-gold-trace-replay.mjs";
import { runFullMatrixOracleProgressGate } from "./hub-full-matrix-oracle-progress-smoke.mjs";

export const PHP_PYTHON_ORACLE_PRODUCT_SMOKE_KIND = "chrysalis.php-python-oracle-product-smoke";
export const PHP_PYTHON_ORACLE_PRODUCT_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SUITE_ID = "plain-php-flagship-python-native";

/** G8763 — php → python structural gold + Flask trace replay on flagship. */
export async function runPhpPythonOracleProductGate() {
  const suite = HUB_GOLD_SUITES.find((s) => s.id === SUITE_ID);
  if (!suite) {
    return { ok: false, skip: "missing-suite" };
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
  const matrixProgress = runFullMatrixOracleProgressGate();
  const phpPythonPairs = (matrixProgress.oracleProductPairs ?? []).filter(
    (p) => p.origin === "php" && p.output === "python",
  );
  return {
    ok: verify.ok === true && replayOk,
    verifyOk: verify.ok === true,
    replayOk,
    replayDetail,
    suiteId: SUITE_ID,
    oracleProductPairsForPhpPython: phpPythonPairs.length,
    matrixOracleProductCount: matrixProgress.oracleProductCount,
  };
}

export async function runPhpPythonOracleProductSmoke() {
  const progress = createSmokeProgress("php-python-oracle-product");
  const t0 = progress.start("PHP→Python oracle product (G8763)");
  const gate = await runPhpPythonOracleProductGate();
  progress.end("PHP→Python oracle product (G8763)", gate.ok === true, t0);
  return {
    kind: PHP_PYTHON_ORACLE_PRODUCT_SMOKE_KIND,
    schemaVersion: PHP_PYTHON_ORACLE_PRODUCT_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runPhpPythonOracleProductSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-php-python-oracle-product-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
