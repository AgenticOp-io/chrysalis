#!/usr/bin/env node
/** Full delivery mega batch: four-origin + symfony delivery (G364). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runFourOriginDeliveryBatchSmoke } from "./hub-four-origin-delivery-batch-smoke.mjs";
import { runSymfonyDeliveryBatchSmoke } from "./hub-symfony-delivery-batch-smoke.mjs";

export const HUB_FULL_DELIVERY_MEGA_BATCH_KIND = "chrysalis.hub.full-delivery-mega-batch-smoke";
export const HUB_FULL_DELIVERY_MEGA_BATCH_SCHEMA_VERSION = 1;

export async function runFullDeliveryMegaBatchSmoke() {
  const fourOrigin = await runFourOriginDeliveryBatchSmoke();
  const symfonyDelivery = await runSymfonyDeliveryBatchSmoke();
  return {
    kind: HUB_FULL_DELIVERY_MEGA_BATCH_KIND,
    schemaVersion: HUB_FULL_DELIVERY_MEGA_BATCH_SCHEMA_VERSION,
    ok: fourOrigin.ok && symfonyDelivery.ok,
    fourOrigin,
    symfonyDelivery,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runFullDeliveryMegaBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
