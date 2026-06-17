#!/usr/bin/env node
/** Full-stack authoring batch v218 (G3479): v217 + Post-63 composite replay depth. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV217Smoke } from "./hub-cwl-authoring-batch-v217-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost218GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V218_KIND = "chrysalis.hub.cwl-authoring-batch-v218";
export const HUB_CWL_AUTHORING_BATCH_V218_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV218Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV217 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV217Smoke(resolvePriorBatchOpts(opts, 217));
  const gate218 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost218GraduationGate({ repoRoot });
  const ok = batchV217.ok === true && gate218.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V218_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V218_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate218Mode: skipPrior ? "evidence-trend" : "post218-graduation",
    batchV217,
    gate218,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV218Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
