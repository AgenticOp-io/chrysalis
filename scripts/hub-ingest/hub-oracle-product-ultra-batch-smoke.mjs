#!/usr/bin/env node
/** Oracle product ultra batch v11: v10 + PHP wedge v8 (G1019). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runOracleStandaloneBatchSmoke } from "./hub-oracle-standalone-batch-smoke.mjs";
import { runLaravelMinOracleBatchSmoke } from "./hub-laravel-min-oracle-batch-smoke.mjs";
import { runTinyBlogOracleBatchSmoke } from "./hub-tiny-blog-oracle-batch-smoke.mjs";
import { runEvidenceStandaloneSmoke } from "./hub-evidence-standalone-smoke.mjs";
import { runPhpOracleMicroVerifyBatchSmoke } from "./hub-php-oracle-micro-verify-batch-smoke.mjs";
import { runPhpNextjsVerifyBatchSmoke } from "./hub-php-nextjs-verify-batch-smoke.mjs";
import { runPhpWedgeBatchSmoke } from "./hub-php-wedge-batch-smoke.mjs";
import { createSmokeProgress, runSmokeStep, smokeResultOk } from "./hub-smoke-progress.mjs";

export const HUB_ORACLE_PRODUCT_ULTRA_BATCH_KIND = "chrysalis.hub.oracle-product-ultra-batch-smoke";
export const HUB_ORACLE_PRODUCT_ULTRA_BATCH_SCHEMA_VERSION = 11;

/** @type {ReadonlyArray<{ id: string, label: string, run: () => Promise<{ ok?: boolean }> }>} */
export const ORACLE_PRODUCT_ULTRA_SLICES = [
  { id: "oracle-standalone", label: "oracle standalone batch", run: runOracleStandaloneBatchSmoke },
  { id: "laravel-min-oracle", label: "laravel-min oracle batch", run: runLaravelMinOracleBatchSmoke },
  { id: "tiny-blog-oracle", label: "tiny-blog oracle batch", run: runTinyBlogOracleBatchSmoke },
  { id: "evidence-standalone", label: "evidence standalone", run: runEvidenceStandaloneSmoke },
  { id: "php-oracle-micro", label: "PHP oracle micro verify", run: runPhpOracleMicroVerifyBatchSmoke },
  { id: "php-nextjs-verify", label: "PHP nextjs verify", run: runPhpNextjsVerifyBatchSmoke },
  { id: "php-wedge", label: "PHP wedge batch", run: runPhpWedgeBatchSmoke },
];

export const ORACLE_PRODUCT_ULTRA_SLICE_IDS = ORACLE_PRODUCT_ULTRA_SLICES.map((s) => s.id);

/** @param {string} sliceId */
function findOracleUltraSlice(sliceId) {
  const slice = ORACLE_PRODUCT_ULTRA_SLICES.find((s) => s.id === sliceId);
  if (!slice) {
    throw new Error(
      `unknown oracle-product-ultra slice: ${sliceId} (expected one of ${ORACLE_PRODUCT_ULTRA_SLICE_IDS.join(", ")})`,
    );
  }
  return slice;
}

/** Run one oracle-product-ultra sub-batch (GCE sub-phase). */
export async function runOracleProductUltraSubSmoke(sliceId) {
  const slice = findOracleUltraSlice(sliceId);
  const result = await runSmokeStep(`oracle-ultra/${sliceId}`, slice.label, () => slice.run());
  const ok = smokeResultOk(result);
  return {
    kind: HUB_ORACLE_PRODUCT_ULTRA_BATCH_KIND,
    schemaVersion: HUB_ORACLE_PRODUCT_ULTRA_BATCH_SCHEMA_VERSION,
    ok,
    sliceId,
    label: slice.label,
    result,
    generatedAt: new Date().toISOString(),
  };
}

export async function runOracleProductUltraBatchSmoke(opts = {}) {
  const onlySlice = opts.onlySlice ?? process.env.CHRYSALIS_ORACLE_ULTRA_SLICE ?? null;
  if (onlySlice) {
    return runOracleProductUltraSubSmoke(String(onlySlice));
  }

  const batch = createSmokeProgress("oracle-product-ultra");
  batch.info(`batch start (${ORACLE_PRODUCT_ULTRA_SLICES.length} slices)`);

  /** @type {Record<string, { ok?: boolean }>} */
  const parts = {};
  for (const slice of ORACLE_PRODUCT_ULTRA_SLICES) {
    parts[slice.id] = await runSmokeStep(`oracle-ultra/${slice.id}`, slice.label, () => slice.run());
  }

  batch.info("batch complete");

  const oracleStandalone = parts["oracle-standalone"];
  const laravelMinOracle = parts["laravel-min-oracle"];
  const tinyBlogOracle = parts["tiny-blog-oracle"];
  const evidenceStandalone = parts["evidence-standalone"];
  const phpOracleMicroVerify = parts["php-oracle-micro"];
  const phpNextjsVerifyBatch = parts["php-nextjs-verify"];
  const phpWedgeBatch = parts["php-wedge"];

  return {
    kind: HUB_ORACLE_PRODUCT_ULTRA_BATCH_KIND,
    schemaVersion: HUB_ORACLE_PRODUCT_ULTRA_BATCH_SCHEMA_VERSION,
    ok:
      oracleStandalone.ok === true &&
      laravelMinOracle.ok === true &&
      tinyBlogOracle.ok === true &&
      evidenceStandalone.ok === true &&
      phpOracleMicroVerify.ok === true &&
      phpNextjsVerifyBatch.ok === true &&
      phpWedgeBatch.ok === true,
    oracleStandalone,
    laravelMinOracle,
    tinyBlogOracle,
    evidenceStandalone,
    phpOracleMicroVerify,
    phpNextjsVerifyBatch,
    phpWedgeBatch,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runOracleProductUltraBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
