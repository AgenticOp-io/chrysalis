#!/usr/bin/env node
/** Verify gaps ingest action standalone smoke (G361). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runVerifyGapsIngestAction } from "./hub-verify-gaps-ingest-action.mjs";

export const HUB_VERIFY_GAPS_INGEST_ACTION_STANDALONE_KIND = "chrysalis.hub.verify-gaps-ingest-action-standalone-smoke";
export const HUB_VERIFY_GAPS_INGEST_ACTION_STANDALONE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const plainPhpFixture = join(scriptRoot, "fixtures/hub-flagship-plain-php");

export async function runVerifyGapsIngestActionStandaloneSmoke(projectDir = plainPhpFixture) {
  const action = await runVerifyGapsIngestAction(projectDir, { reingest: false });
  return {
    kind: HUB_VERIFY_GAPS_INGEST_ACTION_STANDALONE_KIND,
    schemaVersion: HUB_VERIFY_GAPS_INGEST_ACTION_STANDALONE_SCHEMA_VERSION,
    ok: action.ok === true,
    ingestRemediation: action.ingestRemediation?.divergenceKind ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runVerifyGapsIngestActionStandaloneSmoke();
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
