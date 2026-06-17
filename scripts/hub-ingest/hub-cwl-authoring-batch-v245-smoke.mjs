#!/usr/bin/env node
/** Full-stack authoring batch v245 (G3749): v244 + Post-100 session stub replay (Phase K lock) replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV244Smoke } from "./hub-cwl-authoring-batch-v244-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost245GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V245_KIND = "chrysalis.hub.cwl-authoring-batch-v245";
export const HUB_CWL_AUTHORING_BATCH_V245_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV245Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV244 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV244Smoke(resolvePriorBatchOpts(opts, 244));
  const gate245 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost245GraduationGate({ repoRoot });
  const ok = batchV244.ok === true && gate245.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V245_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V245_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate245Mode: skipPrior ? "evidence-trend" : "post245-graduation",
    batchV244,
    gate245,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV245Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
