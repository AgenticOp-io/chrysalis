#!/usr/bin/env node
/** Full-stack authoring batch v112 (G2419): v111 + template/budget depth gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV111Smoke } from "./hub-cwl-authoring-batch-v111-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost112GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V112_KIND = "chrysalis.hub.cwl-authoring-batch-v112";
export const HUB_CWL_AUTHORING_BATCH_V112_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV112Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV111 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV111Smoke(resolvePriorBatchOpts(opts, 111));
  const gate112 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost112GraduationGate({ repoRoot });
  const ok = batchV111.ok === true && gate112.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V112_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V112_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate112Mode: skipPrior ? "evidence-trend" : "post112-graduation",
    batchV111,
    gate112,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV112Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
