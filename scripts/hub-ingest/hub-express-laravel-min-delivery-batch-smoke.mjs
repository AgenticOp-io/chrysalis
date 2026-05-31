#!/usr/bin/env node
/** Express + Laravel-min delivery pair batch (G382). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runExpressDeliveryBatchSmoke } from "./hub-express-delivery-batch-smoke.mjs";
import { runLaravelMinDeliveryBatchSmoke } from "./hub-laravel-min-delivery-batch-smoke.mjs";

export const HUB_EXPRESS_LARAVEL_MIN_DELIVERY_BATCH_KIND = "chrysalis.hub.express-laravel-min-delivery-batch-smoke";
export const HUB_EXPRESS_LARAVEL_MIN_DELIVERY_BATCH_SCHEMA_VERSION = 1;

export async function runExpressLaravelMinDeliveryBatchSmoke() {
  const express = await runExpressDeliveryBatchSmoke();
  const laravelMin = await runLaravelMinDeliveryBatchSmoke();
  return {
    kind: HUB_EXPRESS_LARAVEL_MIN_DELIVERY_BATCH_KIND,
    schemaVersion: HUB_EXPRESS_LARAVEL_MIN_DELIVERY_BATCH_SCHEMA_VERSION,
    ok: express.ok && laravelMin.ok,
    express,
    laravelMin,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runExpressLaravelMinDeliveryBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
