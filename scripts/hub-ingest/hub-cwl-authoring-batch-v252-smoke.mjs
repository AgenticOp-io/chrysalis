#!/usr/bin/env node
/** Full-stack authoring batch v252 (G3819): v251 + Post-107 verify-gaps composite replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV251Smoke } from "./hub-cwl-authoring-batch-v251-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost252GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V252_KIND = "chrysalis.hub.cwl-authoring-batch-v252";
export const HUB_CWL_AUTHORING_BATCH_V252_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV252Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV251 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV251Smoke(resolvePriorBatchOpts(opts, 251));
  const gate252 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost252GraduationGate({ repoRoot });
  const ok = batchV251.ok === true && gate252.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V252_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V252_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate252Mode: skipPrior ? "evidence-trend" : "post252-graduation",
    batchV251,
    gate252,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV252Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
