#!/usr/bin/env node
/** CWL all-origins batch: every hub origin exports migration.cwl (G444). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runProjectToCwlAllOrigins } from "./hub-project-to-cwl-all-origins.mjs";

export const HUB_CWL_ALL_ORIGINS_BATCH_KIND = "chrysalis.hub.cwl-all-origins-batch-smoke";
export const HUB_CWL_ALL_ORIGINS_BATCH_SCHEMA_VERSION = 1;

export async function runCwlAllOriginsBatchSmoke() {
  const allOrigins = await runProjectToCwlAllOrigins();
  return {
    kind: HUB_CWL_ALL_ORIGINS_BATCH_KIND,
    schemaVersion: HUB_CWL_ALL_ORIGINS_BATCH_SCHEMA_VERSION,
    ok: allOrigins.ok === true && (allOrigins.originCount ?? 0) >= 23,
    originCount: allOrigins.originCount ?? null,
    allOrigins,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAllOriginsBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
