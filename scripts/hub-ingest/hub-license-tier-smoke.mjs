#!/usr/bin/env node
/** Hub license tier map + OSS-default status smoke (G5792). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildHubLicenseStatusReport,
  HUB_LICENSE_FEATURES,
  hubTierMeetsMinimum,
} from "./hub-license-status.mjs";

export const HUB_LICENSE_TIER_SMOKE_KIND = "chrysalis.hub.license-tier-smoke";
export const HUB_LICENSE_TIER_SMOKE_SCHEMA_VERSION = 1;

export async function runHubLicenseTierSmoke() {
  const report = await buildHubLicenseStatusReport();
  const featureCount = Object.keys(HUB_LICENSE_FEATURES).length;
  const tiersOk =
    HUB_LICENSE_FEATURES["hub-translate"]?.minTier === "dev" &&
    HUB_LICENSE_FEATURES["hub-batch"]?.minTier === "pro" &&
    HUB_LICENSE_FEATURES["hub-verify-gate"]?.minTier === "pro" &&
    HUB_LICENSE_FEATURES["hub-chimera-cutover"]?.minTier === "enterprise";
  const ladderOk =
    hubTierMeetsMinimum("enterprise", "dev") === true &&
    hubTierMeetsMinimum("pro", "dev") === true &&
    hubTierMeetsMinimum("dev", "pro") === false;
  const ossDefaultOk = report.requireLicense === false && report.gatePass === true;
  const allAllowedWhenOff = report.hubFeatures.every((f) => f.allowed === true);
  return {
    kind: HUB_LICENSE_TIER_SMOKE_KIND,
    schemaVersion: HUB_LICENSE_TIER_SMOKE_SCHEMA_VERSION,
    ok:
      tiersOk &&
      ladderOk &&
      ossDefaultOk &&
      allAllowedWhenOff &&
      featureCount >= 7 &&
      report.hubFeatures.length >= 7,
    featureCount,
    tiersOk,
    ladderOk,
    ossDefaultOk,
    allAllowedWhenOff,
    tier: report.tier ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runHubLicenseTierSmoke();
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
