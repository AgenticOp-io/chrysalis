#!/usr/bin/env node
/** Advisory standalone mega batch: trend + detect + path knowledge (G381). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runEvidenceTrendStandaloneSmoke } from "./hub-evidence-trend-standalone-smoke.mjs";
import { runDetectDatabasesStandaloneSmoke } from "./hub-detect-databases-standalone-smoke.mjs";
import { runPathKnowledgeStandaloneBatchSmoke } from "./hub-path-knowledge-standalone-batch-smoke.mjs";

export const HUB_ADVISORY_STANDALONE_MEGA_BATCH_KIND = "chrysalis.hub.advisory-standalone-mega-batch-smoke";
export const HUB_ADVISORY_STANDALONE_MEGA_BATCH_SCHEMA_VERSION = 1;

export function runAdvisoryStandaloneMegaBatchSmoke() {
  const evidenceTrend = runEvidenceTrendStandaloneSmoke();
  const detectDatabases = runDetectDatabasesStandaloneSmoke();
  const pathKnowledge = runPathKnowledgeStandaloneBatchSmoke();
  return {
    kind: HUB_ADVISORY_STANDALONE_MEGA_BATCH_KIND,
    schemaVersion: HUB_ADVISORY_STANDALONE_MEGA_BATCH_SCHEMA_VERSION,
    ok: evidenceTrend.ok && detectDatabases.ok && pathKnowledge.ok,
    evidenceTrend,
    detectDatabases,
    pathKnowledge,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = runAdvisoryStandaloneMegaBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
