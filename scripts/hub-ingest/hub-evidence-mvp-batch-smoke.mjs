#!/usr/bin/env node
/** Hub evidence MVP batch: verify trend + holes + plan → pipeline gate (G711). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runEvidenceTrendSmoke } from "./hub-evidence-trend-smoke.mjs";
import { runHubEvidenceSmoke } from "./hub-evidence-smoke.mjs";

export const HUB_EVIDENCE_MVP_BATCH_KIND = "chrysalis.hub.evidence-mvp-batch-smoke";
export const HUB_EVIDENCE_MVP_BATCH_SCHEMA_VERSION = 1;

export async function runHubEvidenceMvpBatchSmoke() {
  const trend = runEvidenceTrendSmoke();
  const evidence = await runHubEvidenceSmoke();
  const holeCount = evidence.evidence?.holeCount ?? null;
  const verifyGatePass = evidence.evidence?.verifyGatePass === true;
  const pipelineGatePass = evidence.evidence?.pipelineGatePass === true;
  const programId = evidence.evidence?.programId ?? null;
  const ok =
    trend.ok === true &&
    evidence.ok === true &&
    verifyGatePass &&
    pipelineGatePass &&
    programId === "api-slice" &&
    (holeCount ?? 0) === 0;
  return {
    kind: HUB_EVIDENCE_MVP_BATCH_KIND,
    schemaVersion: HUB_EVIDENCE_MVP_BATCH_SCHEMA_VERSION,
    ok,
    trend: {
      ok: trend.ok === true,
      snapshotCount: trend.snapshotCount ?? null,
      trendPoints: trend.trendPoints ?? null,
      verifyCorrectness: trend.verifyCorrectness ?? null,
    },
    evidence: {
      ok: evidence.ok === true,
      holeCount,
      verifyGatePass,
      pipelineGatePass,
      programId,
    },
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runHubEvidenceMvpBatchSmoke();
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
