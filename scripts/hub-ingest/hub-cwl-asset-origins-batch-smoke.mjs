#!/usr/bin/env node
/** Asset-format origins CWL batch: sql/html/css/json/yaml/markdown/c/cpp (G447). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runProjectToCwlAllOrigins } from "./hub-project-to-cwl-all-origins.mjs";
import { CWL_ORIGIN_FIXTURES } from "./hub-cwl-origin-fixtures.mjs";

export const HUB_CWL_ASSET_ORIGINS_BATCH_KIND = "chrysalis.hub.cwl-asset-origins-batch-smoke";
export const HUB_CWL_ASSET_ORIGINS_BATCH_SCHEMA_VERSION = 1;

const ASSET_ORIGIN_IDS = ["sql", "html", "css", "scss", "json", "yaml", "markdown", "c", "cpp", "cwl"];

export async function runCwlAssetOriginsBatchSmoke() {
  const fixtures = CWL_ORIGIN_FIXTURES.filter((f) => ASSET_ORIGIN_IDS.includes(f.id));
  const report = await runProjectToCwlAllOrigins({ fixtures });
  return {
    kind: HUB_CWL_ASSET_ORIGINS_BATCH_KIND,
    schemaVersion: HUB_CWL_ASSET_ORIGINS_BATCH_SCHEMA_VERSION,
    ok: report.ok === true && fixtures.length === ASSET_ORIGIN_IDS.length,
    originCount: fixtures.length,
    report,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAssetOriginsBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
