#!/usr/bin/env node
/** Full-stack authoring batch v223 (G3529): v222 + Post-68 composite replay depth. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV222Smoke } from "./hub-cwl-authoring-batch-v222-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost223GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V223_KIND = "chrysalis.hub.cwl-authoring-batch-v223";
export const HUB_CWL_AUTHORING_BATCH_V223_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV223Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV222 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV222Smoke(resolvePriorBatchOpts(opts, 222));
  const gate223 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost223GraduationGate({ repoRoot });
  const ok = batchV222.ok === true && gate223.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V223_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V223_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate223Mode: skipPrior ? "evidence-trend" : "post223-graduation",
    batchV222,
    gate223,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV223Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
