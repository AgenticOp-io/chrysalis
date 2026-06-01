#!/usr/bin/env node
/**
 * Full-stack authoring batch v51 (G1661): v50 + CWL fullstack HTTP oracle (hono + fastify).
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV50Smoke } from "./hub-cwl-authoring-batch-v50-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runCwlFullstackVerifyHttpGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V51_KIND = "chrysalis.hub.cwl-authoring-batch-v51";
export const HUB_CWL_AUTHORING_BATCH_V51_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV51Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV50 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV50Smoke(resolvePriorBatchOpts(opts, 50));
  const gate51 = await runCwlFullstackVerifyHttpGate({ repoRoot });
  const ok = batchV50.ok === true && gate51.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V51_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V51_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    
    batchV50,
    gate51,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV51Smoke();
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
