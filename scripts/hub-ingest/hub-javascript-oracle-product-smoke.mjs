#!/usr/bin/env node
/** Phase 41d.17 — Native/CWL/PHP → javascript oracle product via hono emit (G8776). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { HUB_GOLD_SUITES, hubGoldEmitTargetForOutput } from "./hub-gold-manifest.mjs";
import { runGoldVerifySuite } from "./hub-gold-verify.mjs";
import { runTraceReplaySuite } from "./hub-gold-trace-replay.mjs";
import { runFullMatrixOracleProgressGate } from "./hub-full-matrix-oracle-progress-smoke.mjs";
import { resolveHubGo } from "./hub-gold-go-fetch.mjs";
import { resolveHubRuby } from "./hub-gold-ruby-fetch.mjs";
import { resolveHubDotnet } from "./hub-gold-csharp-fetch.mjs";

export const JAVASCRIPT_ORACLE_PRODUCT_SMOKE_KIND = "chrysalis.javascript-oracle-product-smoke";
export const JAVASCRIPT_ORACLE_PRODUCT_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Representative hono suites — census maps javascript output lane to hono emit. */
const JAVASCRIPT_ORACLE_SUITES = [
  { id: "java-literal-hono", skip: null },
  { id: "python-literal-hono", skip: null },
  { id: "go-literal-hono", skip: "go-not-on-path", resolve: resolveHubGo },
  { id: "ruby-literal-hono", skip: "ruby-not-on-path", resolve: resolveHubRuby },
  { id: "csharp-literal-hono", skip: "dotnet-not-on-path", resolve: resolveHubDotnet },
  { id: "ts-literal-hono", skip: null },
  { id: "cwl-gold-hono", skip: null },
  { id: "plain-php-flagship-hono", skip: null },
];

/**
 * @param {{ id: string, skip?: string | null, resolve?: () => string | null }} spec
 */
async function runJavascriptOracleGate(spec) {
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

/** G8776 — hub javascript output lane → hono trace oracle (existing literal-hono suites). */
export async function runJavascriptOracleProductGate() {
  if (hubGoldEmitTargetForOutput("javascript") !== "hono") {
    return { ok: false, skip: "javascript-output-not-mapped-to-hono" };
  }
  const suites = {};
  let allOk = true;
  for (const spec of JAVASCRIPT_ORACLE_SUITES) {
    const r = await runJavascriptOracleGate(spec);
    suites[spec.id] = r;
    const ok = r.ok === true || (spec.skip && r.skip === spec.skip);
    if (!ok) allOk = false;
  }
  const matrixProgress = runFullMatrixOracleProgressGate();
  const javascriptOraclePairs = (matrixProgress.oracleProductPairs ?? []).filter((p) => p.output === "javascript");
  return {
    ok: allOk,
    suites,
    javascriptOracleProductPairs: javascriptOraclePairs.length,
    matrixOracleProductCount: matrixProgress.oracleProductCount,
  };
}

export async function runJavascriptOracleProductSmoke() {
  const progress = createSmokeProgress("javascript-oracle-product");
  const t0 = progress.start("Javascript output oracle product (G8776)");
  const gate = await runJavascriptOracleProductGate();
  progress.end("Javascript output oracle product (G8776)", gate.ok === true, t0);
  return {
    kind: JAVASCRIPT_ORACLE_PRODUCT_SMOKE_KIND,
    schemaVersion: JAVASCRIPT_ORACLE_PRODUCT_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runJavascriptOracleProductSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-javascript-oracle-product-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
