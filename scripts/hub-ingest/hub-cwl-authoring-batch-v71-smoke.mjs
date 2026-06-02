#!/usr/bin/env node
/** Full-stack authoring batch v71 (G1861): v70 + Month 2–3 gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV70Smoke } from "./hub-cwl-authoring-batch-v70-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost70GraduationGate } from "./hub-cwl-fullstack-gates.mjs";
import { runRuntimeHonoParityGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V71_KIND = "chrysalis.hub.cwl-authoring-batch-v71";
export const HUB_CWL_AUTHORING_BATCH_V71_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV71Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV70 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV70Smoke(resolvePriorBatchOpts(opts, 70));
  const gate71 = skipPrior
    ? await runRuntimeHonoParityGate(opts.repoRoot ? { repoRoot: opts.repoRoot } : {})
    : await runPost70GraduationGate({ repoRoot });
  const ok = batchV70.ok === true && gate71.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V71_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V71_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate71Mode: skipPrior ? "runtime-hono-parity" : "post70-graduation",
    batchV70,
    gate71,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV71Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
