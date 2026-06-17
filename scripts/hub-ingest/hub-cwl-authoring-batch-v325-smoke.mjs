#!/usr/bin/env node
/** Full-stack authoring batch v325 (G4549): v324 + Post-108 hub ops mega replay (Phase O lock) replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV324Smoke } from "./hub-cwl-authoring-batch-v324-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost325GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V325_KIND = "chrysalis.hub.cwl-authoring-batch-v325";
export const HUB_CWL_AUTHORING_BATCH_V325_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV325Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV324 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV324Smoke(resolvePriorBatchOpts(opts, 324));
  const gate325 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost325GraduationGate({ repoRoot });
  const ok = batchV324.ok === true && gate325.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V325_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V325_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate325Mode: skipPrior ? "evidence-trend" : "post325-graduation",
    batchV324,
    gate325,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV325Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
