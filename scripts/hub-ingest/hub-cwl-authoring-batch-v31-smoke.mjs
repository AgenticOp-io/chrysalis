#!/usr/bin/env node
/**
 * Full-stack authoring batch v31 (G1461): v30 + runtime-cwl hono parity replay.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV30Smoke } from "./hub-cwl-authoring-batch-v30-smoke.mjs";
import { runRuntimeHonoParityGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V31_KIND = "chrysalis.hub.cwl-authoring-batch-v31";
export const HUB_CWL_AUTHORING_BATCH_V31_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV31Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV30 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV30Smoke({
        ...opts,
        graduationOnly: opts.graduationOnly,
      });
  const gate31 = await runRuntimeHonoParityGate({ repoRoot });
  const ok = batchV30.ok === true && gate31.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V31_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V31_SCHEMA_VERSION,
    ok,
    batchV30,
    gate31,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV31Smoke();
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
