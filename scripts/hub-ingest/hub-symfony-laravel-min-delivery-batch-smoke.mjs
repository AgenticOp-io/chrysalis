#!/usr/bin/env node
/** Symfony + Laravel-min delivery pair batch (G383). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runSymfonyDeliveryBatchSmoke } from "./hub-symfony-delivery-batch-smoke.mjs";
import { runLaravelMinDeliveryBatchSmoke } from "./hub-laravel-min-delivery-batch-smoke.mjs";

export const HUB_SYMFONY_LARAVEL_MIN_DELIVERY_BATCH_KIND = "chrysalis.hub.symfony-laravel-min-delivery-batch-smoke";
export const HUB_SYMFONY_LARAVEL_MIN_DELIVERY_BATCH_SCHEMA_VERSION = 1;

export async function runSymfonyLaravelMinDeliveryBatchSmoke() {
  const symfony = await runSymfonyDeliveryBatchSmoke();
  const laravelMin = await runLaravelMinDeliveryBatchSmoke();
  return {
    kind: HUB_SYMFONY_LARAVEL_MIN_DELIVERY_BATCH_KIND,
    schemaVersion: HUB_SYMFONY_LARAVEL_MIN_DELIVERY_BATCH_SCHEMA_VERSION,
    ok: symfony.ok && laravelMin.ok,
    symfony,
    laravelMin,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runSymfonyLaravelMinDeliveryBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
