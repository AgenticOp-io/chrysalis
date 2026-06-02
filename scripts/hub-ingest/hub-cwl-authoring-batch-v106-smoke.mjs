#!/usr/bin/env node
/** Full-stack authoring batch v106 (G2211): v105 + hub verify-gaps bridge gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV105Smoke } from "./hub-cwl-authoring-batch-v105-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost105GraduationGate } from "./hub-cwl-fullstack-gates.mjs";
import { runOracleProductUltraGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V106_KIND = "chrysalis.hub.cwl-authoring-batch-v106";
export const HUB_CWL_AUTHORING_BATCH_V106_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV106Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV105 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV105Smoke(resolvePriorBatchOpts(opts, 105));
  const gate106 = skipPrior
    ? await runOracleProductUltraGate()
    : await runPost105GraduationGate({ repoRoot });
  const ok = batchV105.ok === true && gate106.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V106_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V106_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate106Mode: skipPrior ? "oracle-product-ultra" : "post105-graduation",
    batchV105,
    gate106,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV106Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
