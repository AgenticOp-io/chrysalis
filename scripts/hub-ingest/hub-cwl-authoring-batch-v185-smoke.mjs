#!/usr/bin/env node
/** Full-stack authoring batch v185 (G3149): v184 + Post-113 production search replay (Phase F lock). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV184Smoke } from "./hub-cwl-authoring-batch-v184-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost185GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V185_KIND = "chrysalis.hub.cwl-authoring-batch-v185";
export const HUB_CWL_AUTHORING_BATCH_V185_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV185Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV184 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV184Smoke(resolvePriorBatchOpts(opts, 184));
  const gate185 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost185GraduationGate({ repoRoot });
  const ok = batchV184.ok === true && gate185.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V185_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V185_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate185Mode: skipPrior ? "evidence-trend" : "post185-graduation",
    batchV184,
    gate185,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV185Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
