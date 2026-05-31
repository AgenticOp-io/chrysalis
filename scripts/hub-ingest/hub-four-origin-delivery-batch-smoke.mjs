#!/usr/bin/env node
/** Four-origin delivery batch: three-origin + Laravel-min (G351). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runThreeOriginDeliveryBatchSmoke } from "./hub-three-origin-delivery-batch-smoke.mjs";
import { runLaravelMinDeliveryBatchSmoke } from "./hub-laravel-min-delivery-batch-smoke.mjs";

export const HUB_FOUR_ORIGIN_DELIVERY_BATCH_KIND = "chrysalis.hub.four-origin-delivery-batch-smoke";
export const HUB_FOUR_ORIGIN_DELIVERY_BATCH_SCHEMA_VERSION = 1;

export async function runFourOriginDeliveryBatchSmoke() {
  const threeOrigin = await runThreeOriginDeliveryBatchSmoke();
  const laravelMin = await runLaravelMinDeliveryBatchSmoke();
  return {
    kind: HUB_FOUR_ORIGIN_DELIVERY_BATCH_KIND,
    schemaVersion: HUB_FOUR_ORIGIN_DELIVERY_BATCH_SCHEMA_VERSION,
    ok: threeOrigin.ok && laravelMin.ok,
    threeOrigin,
    laravelMin,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runFourOriginDeliveryBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
