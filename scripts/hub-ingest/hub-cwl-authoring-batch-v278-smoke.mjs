#!/usr/bin/env node
/** Full-stack authoring batch v278 (G4079): v277 + Post-134 fullstack HTTP + gaps depth replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV277Smoke } from "./hub-cwl-authoring-batch-v277-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost278GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V278_KIND = "chrysalis.hub.cwl-authoring-batch-v278";
export const HUB_CWL_AUTHORING_BATCH_V278_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV278Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV277 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV277Smoke(resolvePriorBatchOpts(opts, 277));
  const gate278 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost278GraduationGate({ repoRoot });
  const ok = batchV277.ok === true && gate278.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V278_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V278_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate278Mode: skipPrior ? "evidence-trend" : "post278-graduation",
    batchV277,
    gate278,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV278Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
