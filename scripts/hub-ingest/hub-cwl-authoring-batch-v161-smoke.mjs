#!/usr/bin/env node
/** Full-stack authoring batch v161 (G2909): v160 + Post-78 composite replay depth. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV160Smoke } from "./hub-cwl-authoring-batch-v160-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost161GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V161_KIND = "chrysalis.hub.cwl-authoring-batch-v161";
export const HUB_CWL_AUTHORING_BATCH_V161_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV161Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV160 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV160Smoke(resolvePriorBatchOpts(opts, 160));
  const gate161 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost161GraduationGate({ repoRoot });
  const ok = batchV160.ok === true && gate161.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V161_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V161_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate161Mode: skipPrior ? "evidence-trend" : "post161-graduation",
    batchV160,
    gate161,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV161Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
