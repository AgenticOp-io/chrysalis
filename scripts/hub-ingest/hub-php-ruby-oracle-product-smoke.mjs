#!/usr/bin/env node
/** Phase 41d.7 — PHP → Ruby native oracle product (G8766). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { HUB_GOLD_SUITES } from "./hub-gold-manifest.mjs";
import { runGoldVerifySuite } from "./hub-gold-verify.mjs";
import { runTraceReplaySuite } from "./hub-gold-trace-replay.mjs";
import { runFullMatrixOracleProgressGate } from "./hub-full-matrix-oracle-progress-smoke.mjs";
import { resolveHubRuby } from "./hub-gold-ruby-fetch.mjs";

export const PHP_RUBY_ORACLE_PRODUCT_SMOKE_KIND = "chrysalis.php-ruby-oracle-product-smoke";
export const PHP_RUBY_ORACLE_PRODUCT_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SUITE_ID = "plain-php-flagship-ruby-native";

/** G8766 — php → ruby structural gold + Sinatra Rack::Test trace replay on flagship. */
export async function runPhpRubyOracleProductGate() {
  if (!resolveHubRuby()) {
    return { ok: false, skip: "ruby-not-on-path" };
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
  const phpRubyPairs = (matrixProgress.oracleProductPairs ?? []).filter(
    (p) => p.origin === "php" && p.output === "ruby",
  );
  return {
    ok: verify.ok === true && replayOk,
    verifyOk: verify.ok === true,
    replayOk,
    replayDetail,
    suiteId: SUITE_ID,
    oracleProductPairsForPhpRuby: phpRubyPairs.length,
    matrixOracleProductCount: matrixProgress.oracleProductCount,
  };
}

export async function runPhpRubyOracleProductSmoke() {
  const progress = createSmokeProgress("php-ruby-oracle-product");
  const t0 = progress.start("PHP→Ruby oracle product (G8766)");
  const gate = await runPhpRubyOracleProductGate();
  progress.end("PHP→Ruby oracle product (G8766)", gate.ok === true, t0);
  return {
    kind: PHP_RUBY_ORACLE_PRODUCT_SMOKE_KIND,
    schemaVersion: PHP_RUBY_ORACLE_PRODUCT_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runPhpRubyOracleProductSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-php-ruby-oracle-product-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
