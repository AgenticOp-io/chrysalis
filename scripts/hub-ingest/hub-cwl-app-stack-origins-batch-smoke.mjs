#!/usr/bin/env node
/** App-stack origins CWL batch: php + js/ts/py/java/go + frameworks (G446). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runProjectToCwlAllOrigins } from "./hub-project-to-cwl-all-origins.mjs";
import { CWL_ORIGIN_FIXTURES } from "./hub-cwl-origin-fixtures.mjs";

export const HUB_CWL_APP_STACK_ORIGINS_BATCH_KIND = "chrysalis.hub.cwl-app-stack-origins-batch-smoke";
export const HUB_CWL_APP_STACK_ORIGINS_BATCH_SCHEMA_VERSION = 1;

const APP_STACK_ORIGIN_IDS = [
  "php",
  "javascript",
  "typescript",
  "python",
  "java",
  "kotlin",
  "go",
  "ruby",
  "csharp",
  "rust",
  "scala",
  "swift",
  "vue",
];

export async function runCwlAppStackOriginsBatchSmoke() {
  const fixtures = CWL_ORIGIN_FIXTURES.filter((f) => APP_STACK_ORIGIN_IDS.includes(f.id));
  const report = await runProjectToCwlAllOrigins({ fixtures });
  return {
    kind: HUB_CWL_APP_STACK_ORIGINS_BATCH_KIND,
    schemaVersion: HUB_CWL_APP_STACK_ORIGINS_BATCH_SCHEMA_VERSION,
    ok: report.ok === true && fixtures.length === APP_STACK_ORIGIN_IDS.length,
    originCount: fixtures.length,
    report,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAppStackOriginsBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
