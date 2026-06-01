#!/usr/bin/env node
/**
 * Full-stack authoring batch v22 (G1373): v21 + Fastify emit verify search parity.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV21Smoke } from "./hub-cwl-authoring-batch-v21-smoke.mjs";
import { runFastifyEmitSearchGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V22_KIND = "chrysalis.hub.cwl-authoring-batch-v22";
export const HUB_CWL_AUTHORING_BATCH_V22_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV22Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const batchV21 = await runCwlAuthoringBatchV21Smoke({ repoRoot });
  const gate22 = await runFastifyEmitSearchGate({ repoRoot });
  const ok = batchV21.ok === true && gate22.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V22_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V22_SCHEMA_VERSION,
    ok,
    batchV21,
    gate22,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV22Smoke();
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
