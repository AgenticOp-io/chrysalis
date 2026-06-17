#!/usr/bin/env node
/** Full-stack authoring batch v231 (G3609): v230 + Post-76 composite replay depth replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV230Smoke } from "./hub-cwl-authoring-batch-v230-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost231GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V231_KIND = "chrysalis.hub.cwl-authoring-batch-v231";
export const HUB_CWL_AUTHORING_BATCH_V231_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV231Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV230 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV230Smoke(resolvePriorBatchOpts(opts, 230));
  const gate231 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost231GraduationGate({ repoRoot });
  const ok = batchV230.ok === true && gate231.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V231_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V231_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate231Mode: skipPrior ? "evidence-trend" : "post231-graduation",
    batchV230,
    gate231,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV231Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
