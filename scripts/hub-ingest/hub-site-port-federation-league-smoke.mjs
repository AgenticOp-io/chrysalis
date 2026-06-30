#!/usr/bin/env node
/** VMF corpus merge + Verify League publish gate (G8450, Phase 34d). */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runSitePortFederationSubmitSmoke } from "./hub-site-port-federation-submit-smoke.mjs";
import { runFederationMergeCorpus } from "../site-port-federation-merge-corpus.mjs";
import { runFederationPublishLeague } from "../site-port-federation-publish-league.mjs";

export const HUB_SITE_PORT_FEDERATION_LEAGUE_KIND = "chrysalis.hub.site-port-federation-league-smoke";
export const HUB_SITE_PORT_FEDERATION_LEAGUE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runSitePortFederationLeagueSmoke(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const submitSmoke = await runSitePortFederationSubmitSmoke({ repoRoot });
  const corpus = await runFederationMergeCorpus({ repoRoot });
  const league = await runFederationPublishLeague({ repoRoot });

  const corpusJsonl = join(repoRoot, "reports/federation/corpus/training-shards.v1.jsonl");
  const leagueHtml = join(repoRoot, "reports/federation/league/index.html");

  const checks = {
    submitOk: submitSmoke.ok === true,
    corpusOk: corpus.ok === true,
    corpusShards: (corpus.shardCount ?? 0) >= 1,
    corpusFile: existsSync(corpusJsonl),
    leagueOk: league.ok === true,
    leagueHtml: existsSync(leagueHtml),
    leagueEntries: (league.entryCount ?? 0) >= 2,
    contributorListed: league.contributorCount >= 1,
  };
  const ok = Object.values(checks).every(Boolean);

  return {
    kind: HUB_SITE_PORT_FEDERATION_LEAGUE_KIND,
    schemaVersion: HUB_SITE_PORT_FEDERATION_LEAGUE_SCHEMA_VERSION,
    ok,
    checks,
    corpus,
    league,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runSitePortFederationLeagueSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
