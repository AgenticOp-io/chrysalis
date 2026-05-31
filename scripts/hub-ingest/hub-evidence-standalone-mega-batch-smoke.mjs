#!/usr/bin/env node
/** Evidence standalone mega batch v3: v2 + gaps ingest closure batch (G835). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runEvidenceStandaloneSmoke } from "./hub-evidence-standalone-smoke.mjs";
import { runWptpGoldStandaloneSmoke } from "./hub-wptp-gold-standalone-smoke.mjs";
import { runHubEvidenceMvpBatchSmoke } from "./hub-evidence-mvp-batch-smoke.mjs";
import { runGapsIngestClosureBatchSmoke } from "./hub-gaps-ingest-closure-batch-smoke.mjs";

export const HUB_EVIDENCE_STANDALONE_MEGA_BATCH_KIND = "chrysalis.hub.evidence-standalone-mega-batch-smoke";
export const HUB_EVIDENCE_STANDALONE_MEGA_BATCH_SCHEMA_VERSION = 3;

export async function runEvidenceStandaloneMegaBatchSmoke() {
  const evidence = await runEvidenceStandaloneSmoke();
  const wptpGold = runWptpGoldStandaloneSmoke();
  const evidenceMvp = await runHubEvidenceMvpBatchSmoke();
  const gapsIngestClosure = runGapsIngestClosureBatchSmoke();
  return {
    kind: HUB_EVIDENCE_STANDALONE_MEGA_BATCH_KIND,
    schemaVersion: HUB_EVIDENCE_STANDALONE_MEGA_BATCH_SCHEMA_VERSION,
    ok: evidence.ok && wptpGold.ok && evidenceMvp.ok && gapsIngestClosure.ok,
    evidence,
    wptpGold,
    evidenceMvp,
    gapsIngestClosure,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runEvidenceStandaloneMegaBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
