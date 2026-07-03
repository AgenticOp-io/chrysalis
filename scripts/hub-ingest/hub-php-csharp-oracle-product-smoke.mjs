#!/usr/bin/env node
/** Phase 41d.8 — PHP → C# native oracle product (G8767). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { HUB_GOLD_SUITES } from "./hub-gold-manifest.mjs";
import { runGoldVerifySuite } from "./hub-gold-verify.mjs";
import { runTraceReplaySuite } from "./hub-gold-trace-replay.mjs";
import { runFullMatrixOracleProgressGate } from "./hub-full-matrix-oracle-progress-smoke.mjs";
import { resolveHubDotnet } from "./hub-gold-csharp-fetch.mjs";

export const PHP_CSHARP_ORACLE_PRODUCT_SMOKE_KIND = "chrysalis.php-csharp-oracle-product-smoke";
export const PHP_CSHARP_ORACLE_PRODUCT_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SUITE_ID = "plain-php-flagship-csharp-native";

/** G8767 — php → csharp structural gold + ASP.NET WebApplicationFactory trace replay on flagship. */
export async function runPhpCsharpOracleProductGate() {
  if (!resolveHubDotnet()) {
    return { ok: false, skip: "dotnet-not-on-path" };
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
  const phpCsharpPairs = (matrixProgress.oracleProductPairs ?? []).filter(
    (p) => p.origin === "php" && p.output === "csharp",
  );
  return {
    ok: verify.ok === true && replayOk,
    verifyOk: verify.ok === true,
    replayOk,
    replayDetail,
    suiteId: SUITE_ID,
    oracleProductPairsForPhpCsharp: phpCsharpPairs.length,
    matrixOracleProductCount: matrixProgress.oracleProductCount,
  };
}

export async function runPhpCsharpOracleProductSmoke() {
  const progress = createSmokeProgress("php-csharp-oracle-product");
  const t0 = progress.start("PHP→C# oracle product (G8767)");
  const gate = await runPhpCsharpOracleProductGate();
  progress.end("PHP→C# oracle product (G8767)", gate.ok === true, t0);
  return {
    kind: PHP_CSHARP_ORACLE_PRODUCT_SMOKE_KIND,
    schemaVersion: PHP_CSHARP_ORACLE_PRODUCT_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runPhpCsharpOracleProductSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-php-csharp-oracle-product-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
