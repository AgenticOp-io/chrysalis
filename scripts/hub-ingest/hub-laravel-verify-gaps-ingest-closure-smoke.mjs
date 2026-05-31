#!/usr/bin/env node
/** Laravel verify gaps ingest closure when backlog fixture present (G804). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildLaravelVerifyGapsReport } from "./hub-laravel-verify-gaps.mjs";
import { runLaravelVerifyGapsAction } from "./hub-laravel-verify-gaps-action.mjs";

export const HUB_LARAVEL_VERIFY_GAPS_INGEST_CLOSURE_KIND = "chrysalis.hub.laravel-verify-gaps-ingest-closure-smoke";
export const HUB_LARAVEL_VERIFY_GAPS_INGEST_CLOSURE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const backlogFixture = join(scriptRoot, "fixtures/hub-laravel-verify-gaps-backlog");

export function runLaravelVerifyGapsIngestClosureSmoke() {
  const gaps = buildLaravelVerifyGapsReport({ reportDirs: [backlogFixture], merge: false });
  const action = runLaravelVerifyGapsAction({ reportDirs: [backlogFixture] });
  const ok =
    gaps.ok === true &&
    (gaps.backlog?.length ?? 0) > 0 &&
    gaps.ingestNext != null &&
    action.ok === true &&
    action.ingestRemediation != null;
  return {
    kind: HUB_LARAVEL_VERIFY_GAPS_INGEST_CLOSURE_KIND,
    schemaVersion: HUB_LARAVEL_VERIFY_GAPS_INGEST_CLOSURE_SCHEMA_VERSION,
    ok,
    backlogCount: gaps.backlog?.length ?? 0,
    ingestNext: gaps.ingestNext?.divergenceKind ?? null,
    ingestRemediation: action.ingestRemediation?.divergenceKind ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = runLaravelVerifyGapsIngestClosureSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
