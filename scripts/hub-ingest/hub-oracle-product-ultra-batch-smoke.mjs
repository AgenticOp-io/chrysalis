#!/usr/bin/env node
/** Oracle product ultra batch v2: v1 + PHP oracle micro verify (G622). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runOracleStandaloneBatchSmoke } from "./hub-oracle-standalone-batch-smoke.mjs";
import { runLaravelMinOracleBatchSmoke } from "./hub-laravel-min-oracle-batch-smoke.mjs";
import { runTinyBlogOracleBatchSmoke } from "./hub-tiny-blog-oracle-batch-smoke.mjs";
import { runEvidenceStandaloneSmoke } from "./hub-evidence-standalone-smoke.mjs";
import { runPhpOracleMicroVerifyBatchSmoke } from "./hub-php-oracle-micro-verify-batch-smoke.mjs";

export const HUB_ORACLE_PRODUCT_ULTRA_BATCH_KIND = "chrysalis.hub.oracle-product-ultra-batch-smoke";
export const HUB_ORACLE_PRODUCT_ULTRA_BATCH_SCHEMA_VERSION = 2;

export async function runOracleProductUltraBatchSmoke() {
  const oracleStandalone = await runOracleStandaloneBatchSmoke();
  const laravelMinOracle = await runLaravelMinOracleBatchSmoke();
  const tinyBlogOracle = await runTinyBlogOracleBatchSmoke();
  const evidenceStandalone = await runEvidenceStandaloneSmoke();
  const phpOracleMicroVerify = await runPhpOracleMicroVerifyBatchSmoke();
  return {
    kind: HUB_ORACLE_PRODUCT_ULTRA_BATCH_KIND,
    schemaVersion: HUB_ORACLE_PRODUCT_ULTRA_BATCH_SCHEMA_VERSION,
    ok:
      oracleStandalone.ok &&
      laravelMinOracle.ok &&
      tinyBlogOracle.ok &&
      evidenceStandalone.ok &&
      phpOracleMicroVerify.ok,
    oracleStandalone,
    laravelMinOracle,
    tinyBlogOracle,
    evidenceStandalone,
    phpOracleMicroVerify,
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
