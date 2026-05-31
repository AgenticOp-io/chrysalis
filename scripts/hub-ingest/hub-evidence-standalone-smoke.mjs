#!/usr/bin/env node
/** Hub evidence standalone smoke wrapper (G368). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runHubEvidenceSmoke } from "./hub-evidence-smoke.mjs";

export const HUB_EVIDENCE_STANDALONE_KIND = "chrysalis.hub.evidence-standalone-smoke";
export const HUB_EVIDENCE_STANDALONE_SCHEMA_VERSION = 1;

export async function runEvidenceStandaloneSmoke() {
  const evidence = await runHubEvidenceSmoke();
  return {
    kind: HUB_EVIDENCE_STANDALONE_KIND,
    schemaVersion: HUB_EVIDENCE_STANDALONE_SCHEMA_VERSION,
    ok: evidence.ok === true || evidence.skip != null,
    skip: evidence.skip ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runEvidenceStandaloneSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
