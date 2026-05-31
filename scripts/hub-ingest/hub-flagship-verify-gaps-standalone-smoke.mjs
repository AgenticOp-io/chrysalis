#!/usr/bin/env node
/** Per-flagship verify gaps export + ingest action closure (G772). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildProjectVerifyGapsIngestReport } from "./hub-verify-gaps-ingest.mjs";
import { runVerifyGapsIngestAction } from "./hub-verify-gaps-ingest-action.mjs";

export const HUB_FLAGSHIP_VERIFY_GAPS_STANDALONE_KIND = "chrysalis.hub.flagship-verify-gaps-standalone-smoke";
export const HUB_FLAGSHIP_VERIFY_GAPS_STANDALONE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** @type {Record<string, { rel: string }>} */
export const FLAGSHIP_VERIFY_GAPS_FIXTURES = {
  plainPhp: { rel: "fixtures/hub-flagship-plain-php" },
  symfony: { rel: "fixtures/hub-flagship-symfony" },
  express: { rel: "fixtures/hub-flagship-express" },
};

/**
 * @param {string} [projectDir]
 * @param {{ profile?: keyof typeof FLAGSHIP_VERIFY_GAPS_FIXTURES }} [opts]
 */
export function runFlagshipVerifyGapsStandaloneSmoke(projectDir, opts = {}) {
  const profile = opts.profile ?? "plainPhp";
  const fixture = FLAGSHIP_VERIFY_GAPS_FIXTURES[profile] ?? FLAGSHIP_VERIFY_GAPS_FIXTURES.plainPhp;
  const root = resolve(projectDir ?? join(scriptRoot, fixture.rel));
  const gaps = buildProjectVerifyGapsIngestReport(root);
  const action = runVerifyGapsIngestAction(root, { reingest: false });
  const gapsOk = gaps.ok === true || gaps.skipped === "no-verify-report";
  return {
    kind: HUB_FLAGSHIP_VERIFY_GAPS_STANDALONE_KIND,
    schemaVersion: HUB_FLAGSHIP_VERIFY_GAPS_STANDALONE_SCHEMA_VERSION,
    profile,
    fixture: fixture.rel,
    ok: gapsOk && action.ok === true,
    backlogCount: gaps.backlog?.length ?? 0,
    ingestNext: gaps.ingestNext?.divergenceKind ?? null,
    skipped: gaps.skipped ?? null,
    ingestRemediation: action.ingestRemediation?.divergenceKind ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = runFlagshipVerifyGapsStandaloneSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
