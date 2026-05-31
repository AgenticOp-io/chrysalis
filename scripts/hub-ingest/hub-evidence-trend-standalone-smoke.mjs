#!/usr/bin/env node
/** Evidence trend standalone smoke wrapper (G358). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runEvidenceTrendSmoke } from "./hub-evidence-trend-smoke.mjs";

export const HUB_EVIDENCE_TREND_STANDALONE_KIND = "chrysalis.hub.evidence-trend-standalone-smoke";
export const HUB_EVIDENCE_TREND_STANDALONE_SCHEMA_VERSION = 1;

export function runEvidenceTrendStandaloneSmoke() {
  const trend = runEvidenceTrendSmoke();
  return {
    kind: HUB_EVIDENCE_TREND_STANDALONE_KIND,
    schemaVersion: HUB_EVIDENCE_TREND_STANDALONE_SCHEMA_VERSION,
    ok: trend.ok === true,
    snapshotCount: trend.snapshotCount ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = runEvidenceTrendStandaloneSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
