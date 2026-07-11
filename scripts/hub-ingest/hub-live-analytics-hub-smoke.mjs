#!/usr/bin/env node
/** Live analytics hub smoke (G9650 / D6385). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runWebLlmBuildLiveAnalyticsHub } from "../web-llm-build-live-analytics-hub.mjs";

export const HUB_LIVE_ANALYTICS_HUB_KIND = "chrysalis.hub.live-analytics-hub-smoke";
export const HUB_LIVE_ANALYTICS_HUB_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runLiveAnalyticsHubSmoke(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const hub = await runWebLlmBuildLiveAnalyticsHub({ repoRoot });
  const html = existsSync(hub.indexPath ?? "")
    ? readFileSync(hub.indexPath, "utf8")
    : "";

  const checks = {
    hubOk: hub.ok === true,
    htmlExists: existsSync(join(repoRoot, "reports/web-llm/operator-evidence/poc/index.html")),
    mentionsSalience: html.includes("Salience v2"),
    mentionsProduct: html.includes("Product sample") || html.includes("Product hit-rate"),
    mentionsLive: html.includes("Live hit-rate"),
    showsJobTable: html.includes("Recent jobs"),
    productFloorDocumented: html.includes("50") || hub.jobCount >= 50,
    honestSampleGate:
      hub.productMetricsReady === true
        ? hub.jobCount >= 50
        : hub.jobCount < 50,
    honestLiveGate:
      hub.productLiveReady === true
        ? (hub.liveVerifiedJobCount ?? 0) >= 50
        : true,
  };
  const ok = Object.values(checks).every(Boolean);

  return {
    kind: HUB_LIVE_ANALYTICS_HUB_KIND,
    schemaVersion: HUB_LIVE_ANALYTICS_HUB_SCHEMA_VERSION,
    ok,
    checks,
    hub,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runLiveAnalyticsHubSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-live-analytics-hub-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
