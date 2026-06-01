#!/usr/bin/env node
/**
 * Full-stack authoring batch v15 (G1304): v14 + Emitted hono page HTML probe.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV14Smoke } from "./hub-cwl-authoring-batch-v14-smoke.mjs";
import { runEmitPageProbeGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V15_KIND = "chrysalis.hub.cwl-authoring-batch-v15";
export const HUB_CWL_AUTHORING_BATCH_V15_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV15Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const batchV14 = await runCwlAuthoringBatchV14Smoke({ repoRoot });
  const gate15 = await runEmitPageProbeGate({ repoRoot });
  const ok = batchV14.ok === true && gate15.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V15_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V15_SCHEMA_VERSION,
    ok,
    batchV14,
    gate15,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV15Smoke();
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
