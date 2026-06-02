#!/usr/bin/env node
/** Full-stack authoring batch v88 (G2031): v87 + Month 2–3 gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV87Smoke } from "./hub-cwl-authoring-batch-v87-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost87GraduationGate } from "./hub-cwl-fullstack-gates.mjs";
import { runPost70Month2CompositeGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V88_KIND = "chrysalis.hub.cwl-authoring-batch-v88";
export const HUB_CWL_AUTHORING_BATCH_V88_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV88Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV87 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV87Smoke(resolvePriorBatchOpts(opts, 87));
  const gate88 = skipPrior
    ? await runPost70Month2CompositeGate(opts.repoRoot ? { repoRoot: opts.repoRoot } : {})
    : await runPost87GraduationGate({ repoRoot });
  const ok = batchV87.ok === true && gate88.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V88_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V88_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate88Mode: skipPrior ? "post70-month2-composite" : "post87-graduation",
    batchV87,
    gate88,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV88Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
