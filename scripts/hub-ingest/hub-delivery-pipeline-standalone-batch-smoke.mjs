#!/usr/bin/env node
/** Delivery pipeline standalone batch on four profiles (G370). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runDeliveryPipelineBatch } from "./hub-delivery-pipeline-smoke.mjs";

export const HUB_DELIVERY_PIPELINE_STANDALONE_BATCH_KIND = "chrysalis.hub.delivery-pipeline-standalone-batch-smoke";
export const HUB_DELIVERY_PIPELINE_STANDALONE_BATCH_SCHEMA_VERSION = 1;

export async function runDeliveryPipelineStandaloneBatchSmoke() {
  const batch = await runDeliveryPipelineBatch(["plainPhp", "symfony", "express", "laravelMin"]);
  return {
    kind: HUB_DELIVERY_PIPELINE_STANDALONE_BATCH_KIND,
    schemaVersion: HUB_DELIVERY_PIPELINE_STANDALONE_BATCH_SCHEMA_VERSION,
    ok: batch.ok === true,
    profiles: batch.results ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runDeliveryPipelineStandaloneBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
