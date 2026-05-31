#!/usr/bin/env node
/** Symfony delivery standalone batch smoke (G352). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runSiteIntelligenceSymfonySmoke } from "./hub-site-intelligence-symfony-smoke.mjs";
import { runPathAdviceSymfonySmoke } from "./hub-path-advice-symfony-smoke.mjs";
import { runVerifyGapsSymfonySmoke } from "./hub-verify-gaps-symfony-smoke.mjs";
import { runPostTranslateArtifactsSymfonySmoke } from "./hub-post-translate-artifacts-symfony-smoke.mjs";

export const HUB_SYMFONY_DELIVERY_BATCH_KIND = "chrysalis.hub.symfony-delivery-batch-smoke";
export const HUB_SYMFONY_DELIVERY_BATCH_SCHEMA_VERSION = 1;

export async function runSymfonyDeliveryBatchSmoke() {
  const siteIntelligence = await runSiteIntelligenceSymfonySmoke();
  const pathAdvice = await runPathAdviceSymfonySmoke();
  const verifyGaps = runVerifyGapsSymfonySmoke();
  const postTranslateArtifacts = await runPostTranslateArtifactsSymfonySmoke();
  return {
    kind: HUB_SYMFONY_DELIVERY_BATCH_KIND,
    schemaVersion: HUB_SYMFONY_DELIVERY_BATCH_SCHEMA_VERSION,
    ok: siteIntelligence.ok && pathAdvice.ok && verifyGaps.ok && postTranslateArtifacts.ok,
    siteIntelligence,
    pathAdvice,
    verifyGaps,
    postTranslateArtifacts,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runSymfonyDeliveryBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
