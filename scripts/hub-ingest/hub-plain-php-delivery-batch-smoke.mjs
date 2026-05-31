#!/usr/bin/env node
/** Plain-php delivery standalone batch smoke (G328). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runSiteIntelligenceSmoke } from "./hub-site-intelligence-smoke.mjs";
import { runPathAdviceSmoke } from "./hub-path-advice-smoke.mjs";
import { runVerifyGapsIngestSmoke } from "./hub-verify-gaps-ingest-smoke.mjs";
import { runPostTranslateArtifactsSmoke } from "./hub-post-translate-artifacts-smoke.mjs";

export const HUB_PLAIN_PHP_DELIVERY_BATCH_KIND = "chrysalis.hub.plain-php-delivery-batch-smoke";
export const HUB_PLAIN_PHP_DELIVERY_BATCH_SCHEMA_VERSION = 1;

export async function runPlainPhpDeliveryBatchSmoke() {
  const siteIntelligence = await runSiteIntelligenceSmoke();
  const pathAdvice = await runPathAdviceSmoke();
  const verifyGaps = runVerifyGapsIngestSmoke();
  const postTranslateArtifacts = await runPostTranslateArtifactsSmoke();
  return {
    kind: HUB_PLAIN_PHP_DELIVERY_BATCH_KIND,
    schemaVersion: HUB_PLAIN_PHP_DELIVERY_BATCH_SCHEMA_VERSION,
    ok: siteIntelligence.ok && pathAdvice.ok && verifyGaps.ok && postTranslateArtifacts.ok,
    siteIntelligence,
    pathAdvice,
    verifyGaps,
    postTranslateArtifacts,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runPlainPhpDeliveryBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
