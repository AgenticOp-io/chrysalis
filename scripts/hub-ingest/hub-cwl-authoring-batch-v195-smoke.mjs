#!/usr/bin/env node
/** Full-stack authoring batch v195 (G3249): v194 + Post-123 query HTML + layout search replay (Phase G lock). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV194Smoke } from "./hub-cwl-authoring-batch-v194-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost195GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V195_KIND = "chrysalis.hub.cwl-authoring-batch-v195";
export const HUB_CWL_AUTHORING_BATCH_V195_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV195Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV194 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV194Smoke(resolvePriorBatchOpts(opts, 194));
  const gate195 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost195GraduationGate({ repoRoot });
  const ok = batchV194.ok === true && gate195.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V195_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V195_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate195Mode: skipPrior ? "evidence-trend" : "post195-graduation",
    batchV194,
    gate195,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV195Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
