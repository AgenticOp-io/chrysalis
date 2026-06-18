#!/usr/bin/env node
/** Delivery dashboard smoke on plain-php flagship (G152 reinforcement). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildDeliveryDashboard,
  HUB_DELIVERY_DASHBOARD_SCHEMA_VERSION,
} from "./hub-delivery-dashboard.mjs";

export const HUB_DELIVERY_DASHBOARD_SMOKE_KIND = "chrysalis.hub.delivery-dashboard-smoke";
export const HUB_DELIVERY_DASHBOARD_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const defaultFixture = join(scriptRoot, "fixtures/hub-flagship-plain-php");

/** @param {string} [projectDir] */
export async function runDeliveryDashboardSmoke(projectDir = defaultFixture) {
  const report = await buildDeliveryDashboard(resolve(projectDir), { origin: "php", output: "hono" });
  return {
    kind: HUB_DELIVERY_DASHBOARD_SMOKE_KIND,
    schemaVersion: HUB_DELIVERY_DASHBOARD_SMOKE_SCHEMA_VERSION,
    ok:
      report.kind === "chrysalis.hub.delivery-dashboard" &&
      report.schemaVersion === HUB_DELIVERY_DASHBOARD_SCHEMA_VERSION &&
      Array.isArray(report.artifacts) &&
      report.artifacts.length > 0 &&
      (report.license?.hubFeatures?.length ?? 0) > 0,
    dashboardSchemaVersion: report.schemaVersion ?? null,
    artifactCount: report.artifacts?.length ?? 0,
    licenseFeatureCount: report.license?.hubFeatures?.length ?? 0,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runDeliveryDashboardSmoke();
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
