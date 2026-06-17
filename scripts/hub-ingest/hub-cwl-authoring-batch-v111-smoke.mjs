#!/usr/bin/env node
/** Full-stack authoring batch v111 (G2409): v110 + post-110 full-stack pilot depth gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV110Smoke } from "./hub-cwl-authoring-batch-v110-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost111GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V111_KIND = "chrysalis.hub.cwl-authoring-batch-v111";
export const HUB_CWL_AUTHORING_BATCH_V111_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV111Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV110 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV110Smoke(resolvePriorBatchOpts(opts, 110));
  const gate111 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost111GraduationGate({ repoRoot });
  const ok = batchV110.ok === true && gate111.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V111_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V111_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate111Mode: skipPrior ? "evidence-trend" : "post111-graduation",
    batchV110,
    gate111,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV111Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
