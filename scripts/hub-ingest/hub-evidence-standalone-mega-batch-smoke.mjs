#!/usr/bin/env node
/** Evidence standalone mega batch v9: v8 + reingest Fastify HTTP (G1017). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runEvidenceStandaloneSmoke } from "./hub-evidence-standalone-smoke.mjs";
import { runWptpGoldStandaloneSmoke } from "./hub-wptp-gold-standalone-smoke.mjs";
import { runHubEvidenceMvpBatchSmoke } from "./hub-evidence-mvp-batch-smoke.mjs";
import { runGapsIngestClosureBatchSmoke } from "./hub-gaps-ingest-closure-batch-smoke.mjs";
import { runLaravelAuthProbeReingestVerifyClosureSmoke } from "./hub-laravel-auth-probe-reingest-verify-closure-smoke.mjs";
import { runLaravelAuthProbeReingestVerifyReplaySmoke } from "./hub-laravel-auth-probe-reingest-verify-replay-smoke.mjs";
import { runLaravelAuthProbeReingestVerifyHttpSmoke } from "./hub-laravel-auth-probe-reingest-verify-http-smoke.mjs";
import { runIrHelperLiftingEmbedSmoke } from "./hub-ir-helper-lifting-embed-smoke.mjs";
import { runLaravelAuthProbeReingestVerifyHttpFastifySmoke } from "./hub-laravel-auth-probe-reingest-verify-http-fastify-smoke.mjs";

export const HUB_EVIDENCE_STANDALONE_MEGA_BATCH_KIND = "chrysalis.hub.evidence-standalone-mega-batch-smoke";
export const HUB_EVIDENCE_STANDALONE_MEGA_BATCH_SCHEMA_VERSION = 9;

export async function runEvidenceStandaloneMegaBatchSmoke() {
  const evidence = await runEvidenceStandaloneSmoke();
  const wptpGold = runWptpGoldStandaloneSmoke();
  const evidenceMvp = await runHubEvidenceMvpBatchSmoke();
  const gapsIngestClosure = await runGapsIngestClosureBatchSmoke();
  const authProbeVerifyClosure = await runLaravelAuthProbeReingestVerifyClosureSmoke();
  const authProbeVerifyReplay = await runLaravelAuthProbeReingestVerifyReplaySmoke();
  const authProbeVerifyHttp = await runLaravelAuthProbeReingestVerifyHttpSmoke();
  const irHelperLiftingEmbed = runIrHelperLiftingEmbedSmoke();
  const authProbeReingestVerifyHttpFastify = await runLaravelAuthProbeReingestVerifyHttpFastifySmoke();
  return {
    kind: HUB_EVIDENCE_STANDALONE_MEGA_BATCH_KIND,
    schemaVersion: HUB_EVIDENCE_STANDALONE_MEGA_BATCH_SCHEMA_VERSION,
    ok:
      evidence.ok &&
      wptpGold.ok &&
      evidenceMvp.ok &&
      gapsIngestClosure.ok &&
      authProbeVerifyClosure.ok &&
      authProbeVerifyReplay.ok &&
      authProbeVerifyHttp.ok &&
      irHelperLiftingEmbed.ok &&
      authProbeReingestVerifyHttpFastify.ok,
    evidence,
    wptpGold,
    evidenceMvp,
    gapsIngestClosure,
    authProbeVerifyClosure,
    authProbeVerifyReplay,
    authProbeVerifyHttp,
    irHelperLiftingEmbed,
    authProbeReingestVerifyHttpFastify,
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
