#!/usr/bin/env node
/** Full-stack authoring batch v105 (G2201): v104 + hub verify-gaps bridge gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV104Smoke } from "./hub-cwl-authoring-batch-v104-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost104GraduationGate } from "./hub-cwl-fullstack-gates.mjs";
import { runMigrationOsMegaGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V105_KIND = "chrysalis.hub.cwl-authoring-batch-v105";
export const HUB_CWL_AUTHORING_BATCH_V105_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV105Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV104 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV104Smoke(resolvePriorBatchOpts(opts, 104));
  const gate105 = skipPrior
    ? await runMigrationOsMegaGate()
    : await runPost104GraduationGate({ repoRoot });
  const ok = batchV104.ok === true && gate105.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V105_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V105_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate105Mode: skipPrior ? "migration-os-mega" : "post104-graduation",
    batchV104,
    gate105,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV105Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
