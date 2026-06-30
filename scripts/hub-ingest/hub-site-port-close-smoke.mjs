#!/usr/bin/env node
/** Site → CWL + LLM program close gate (G8400, Phase 33). */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runSitePortToCwl, SITE_PORT_REPORT_KIND, SITE_PORT_REPORT_SCHEMA_VERSION } from "../site-port-to-cwl.mjs";

export const HUB_SITE_PORT_CLOSE_KIND = "chrysalis.hub.site-port-close-smoke";
export const HUB_SITE_PORT_CLOSE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const tinyBlogFixture = join(scriptRoot, "fixtures/tiny-blog");

/**
 * @param {object} [opts]
 * @param {string} [opts.projectDir]
 * @param {number} [opts.minRoutes]
 */
export async function runSitePortCloseSmoke(opts = {}) {
  const projectDir = resolve(opts.projectDir ?? tinyBlogFixture);
  const minRoutes = opts.minRoutes ?? 5;
  const report = await runSitePortToCwl({
    projectDir,
    repoRoot: scriptRoot,
    origin: "php",
    minRoutes,
    exportDataset: true,
  });

  const cwlPath = report.cwl?.cwlPath ?? join(projectDir, ".chrysalis", "migration.cwl");
  const intelPath = join(projectDir, ".chrysalis", "site-intelligence.json");
  const portReportPath = join(projectDir, ".chrysalis", "site-port.json");
  const trajectoryPath = report.trajectory?.path ?? null;

  const checks = {
    portReportOk: report.ok === true,
    reportKind: report.kind === SITE_PORT_REPORT_KIND,
    routeCount: (report.cwl?.routeCount ?? 0) >= minRoutes,
    cwlExists: existsSync(cwlPath),
    intelligenceExists: existsSync(intelPath),
    portReportExists: existsSync(portReportPath),
    trajectoryExists: trajectoryPath ? existsSync(trajectoryPath) : false,
    trajectoryRecords: (report.trajectory?.recordCount ?? 0) >= 8,
    datasetShards: (report.dataset?.shardCount ?? 0) > 0,
    verifyOk: report.verify?.ok === true,
    verifyCorrectness: (report.verify?.correctness ?? 0) >= 1,
  };

  const ok = Object.values(checks).every(Boolean);

  return {
    kind: HUB_SITE_PORT_CLOSE_KIND,
    schemaVersion: HUB_SITE_PORT_CLOSE_SCHEMA_VERSION,
    ok,
    fixture: projectDir,
    minRoutes,
    checks,
    port: report,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runSitePortCloseSmoke();
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
