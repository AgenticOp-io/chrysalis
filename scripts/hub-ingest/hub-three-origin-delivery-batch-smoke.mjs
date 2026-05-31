#!/usr/bin/env node
/** Three-origin delivery mega batch: plain-php + symfony + express (G330). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runPlainPhpDeliveryBatchSmoke } from "./hub-plain-php-delivery-batch-smoke.mjs";
import { runExpressDeliveryBatchSmoke } from "./hub-express-delivery-batch-smoke.mjs";
import { runSymfonyMigrationOsBatchSmoke } from "./hub-symfony-migration-os-batch-smoke.mjs";

export const HUB_THREE_ORIGIN_DELIVERY_BATCH_KIND = "chrysalis.hub.three-origin-delivery-batch-smoke";
export const HUB_THREE_ORIGIN_DELIVERY_BATCH_SCHEMA_VERSION = 1;

export async function runThreeOriginDeliveryBatchSmoke() {
  const plainPhp = await runPlainPhpDeliveryBatchSmoke();
  const express = await runExpressDeliveryBatchSmoke();
  const symfony = await runSymfonyMigrationOsBatchSmoke();
  return {
    kind: HUB_THREE_ORIGIN_DELIVERY_BATCH_KIND,
    schemaVersion: HUB_THREE_ORIGIN_DELIVERY_BATCH_SCHEMA_VERSION,
    ok: plainPhp.ok && express.ok && symfony.ok,
    plainPhp,
    express,
    symfony,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runThreeOriginDeliveryBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
