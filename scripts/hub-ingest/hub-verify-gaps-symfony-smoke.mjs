#!/usr/bin/env node
/** Verify gaps ingest smoke on Symfony flagship (G279). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildProjectVerifyGapsIngestReport } from "./hub-verify-gaps-ingest.mjs";

export const HUB_VERIFY_GAPS_SYMFONY_SMOKE_KIND = "chrysalis.hub.verify-gaps-symfony-smoke";
export const HUB_VERIFY_GAPS_SYMFONY_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const symfonyFixture = join(scriptRoot, "fixtures/hub-flagship-symfony");

export function runVerifyGapsSymfonySmoke(projectDir = symfonyFixture) {
  const report = buildProjectVerifyGapsIngestReport(resolve(projectDir));
  return {
    kind: HUB_VERIFY_GAPS_SYMFONY_SMOKE_KIND,
    schemaVersion: HUB_VERIFY_GAPS_SYMFONY_SMOKE_SCHEMA_VERSION,
    ok: report.ok === true || report.skipped === "no-verify-report",
    backlogCount: report.backlog?.length ?? 0,
    hasIngestNext: report.ingestNext != null,
    skipped: report.skipped ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = runVerifyGapsSymfonySmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
