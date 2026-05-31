#!/usr/bin/env node
/** PHP wedge batch v3: v2 + gaps ingest strict batch v2 (G866). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runPhpNextjsVerifyBatchSmoke } from "./hub-php-nextjs-verify-batch-smoke.mjs";
import { runPhpOracleMicroVerifyBatchSmoke } from "./hub-php-oracle-micro-verify-batch-smoke.mjs";
import { runLaravelVerifyGapsBatchSmoke } from "./hub-laravel-verify-gaps-batch-smoke.mjs";
import { runNodeExpressOracleStandaloneSmoke } from "./hub-node-express-oracle-standalone-smoke.mjs";
import { runGapsIngestClosureBatchSmoke } from "./hub-gaps-ingest-closure-batch-smoke.mjs";
import { runGapsIngestStrictBatchSmoke } from "./hub-gaps-ingest-strict-batch-smoke.mjs";

export const HUB_PHP_WEDGE_BATCH_KIND = "chrysalis.hub.php-wedge-batch-smoke";
export const HUB_PHP_WEDGE_BATCH_SCHEMA_VERSION = 3;

export async function runPhpWedgeBatchSmoke() {
  const nextjsVerify = await runPhpNextjsVerifyBatchSmoke();
  const oracleMicro = await runPhpOracleMicroVerifyBatchSmoke();
  const laravelGaps = runLaravelVerifyGapsBatchSmoke();
  const nodeExpressOracle = await runNodeExpressOracleStandaloneSmoke();
  const gapsIngestClosure = runGapsIngestClosureBatchSmoke();
  const gapsIngestStrict = runGapsIngestStrictBatchSmoke();
  const ok =
    nextjsVerify.ok === true &&
    oracleMicro.ok === true &&
    laravelGaps.ok === true &&
    nodeExpressOracle.ok === true &&
    gapsIngestClosure.ok === true &&
    gapsIngestStrict.ok === true;
  return {
    kind: HUB_PHP_WEDGE_BATCH_KIND,
    schemaVersion: HUB_PHP_WEDGE_BATCH_SCHEMA_VERSION,
    ok,
    nextjsVerify,
    oracleMicro,
    laravelGaps,
    nodeExpressOracle,
    gapsIngestClosure,
    gapsIngestStrict,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runPhpWedgeBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
