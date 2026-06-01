#!/usr/bin/env node
/**
 * Full-stack authoring batch v43 (G1581): v42 + Chimera cutover runbook on plain-php flagship.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV42Smoke } from "./hub-cwl-authoring-batch-v42-smoke.mjs";
import { runChimeraCutoverGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V43_KIND = "chrysalis.hub.cwl-authoring-batch-v43";
export const HUB_CWL_AUTHORING_BATCH_V43_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV43Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV42 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV42Smoke({ ...opts, repoRoot });
  const gate43 = await runChimeraCutoverGate({ repoRoot });
  const ok = batchV42.ok === true && gate43.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V43_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V43_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    
    batchV42,
    gate43,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV43Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
