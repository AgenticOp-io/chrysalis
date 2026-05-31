#!/usr/bin/env node
/** All delivery ultra mega batch (G384). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runFullDeliveryMegaBatchSmoke } from "./hub-full-delivery-mega-batch-smoke.mjs";
import { runPlainPhpDeliveryBatchSmoke } from "./hub-plain-php-delivery-batch-smoke.mjs";
import { runExpressDeliveryBatchSmoke } from "./hub-express-delivery-batch-smoke.mjs";
import { runTinyBlogDeliveryBatchSmoke } from "./hub-tiny-blog-delivery-batch-smoke.mjs";

export const HUB_ALL_DELIVERY_ULTRA_MEGA_BATCH_KIND = "chrysalis.hub.all-delivery-ultra-mega-batch-smoke";
export const HUB_ALL_DELIVERY_ULTRA_MEGA_BATCH_SCHEMA_VERSION = 1;

export async function runAllDeliveryUltraMegaBatchSmoke() {
  const fullDelivery = await runFullDeliveryMegaBatchSmoke();
  const plainPhp = await runPlainPhpDeliveryBatchSmoke();
  const express = await runExpressDeliveryBatchSmoke();
  const tinyBlog = await runTinyBlogDeliveryBatchSmoke();
  return {
    kind: HUB_ALL_DELIVERY_ULTRA_MEGA_BATCH_KIND,
    schemaVersion: HUB_ALL_DELIVERY_ULTRA_MEGA_BATCH_SCHEMA_VERSION,
    ok: fullDelivery.ok && plainPhp.ok && express.ok && tinyBlog.ok,
    fullDelivery,
    plainPhp,
    express,
    tinyBlog,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runAllDeliveryUltraMegaBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
