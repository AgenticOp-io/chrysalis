#!/usr/bin/env node
/** Phase 41d.6 — PHP → Go native oracle product (G8765). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { HUB_GOLD_SUITES } from "./hub-gold-manifest.mjs";
import { runGoldVerifySuite } from "./hub-gold-verify.mjs";
import { runTraceReplaySuite } from "./hub-gold-trace-replay.mjs";
import { runFullMatrixOracleProgressGate } from "./hub-full-matrix-oracle-progress-smoke.mjs";
import { resolveHubGo } from "./hub-gold-go-fetch.mjs";

export const PHP_GO_ORACLE_PRODUCT_SMOKE_KIND = "chrysalis.php-go-oracle-product-smoke";
export const PHP_GO_ORACLE_PRODUCT_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SUITE_ID = "plain-php-flagship-go-native";

/** G8765 — php → go structural gold + Gin httptest trace replay on flagship. */
export async function runPhpGoOracleProductGate() {
  if (!resolveHubGo()) {
    return { ok: false, skip: "go-not-on-path" };
  }
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
  const phpGoPairs = (matrixProgress.oracleProductPairs ?? []).filter(
    (p) => p.origin === "php" && p.output === "go",
  );
  return {
    ok: verify.ok === true && replayOk,
    verifyOk: verify.ok === true,
    replayOk,
    replayDetail,
    suiteId: SUITE_ID,
    oracleProductPairsForPhpGo: phpGoPairs.length,
    matrixOracleProductCount: matrixProgress.oracleProductCount,
  };
}

export async function runPhpGoOracleProductSmoke() {
  const progress = createSmokeProgress("php-go-oracle-product");
  const t0 = progress.start("PHP→Go oracle product (G8765)");
  const gate = await runPhpGoOracleProductGate();
  progress.end("PHP→Go oracle product (G8765)", gate.ok === true, t0);
  return {
    kind: PHP_GO_ORACLE_PRODUCT_SMOKE_KIND,
    schemaVersion: PHP_GO_ORACLE_PRODUCT_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runPhpGoOracleProductSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-php-go-oracle-product-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
