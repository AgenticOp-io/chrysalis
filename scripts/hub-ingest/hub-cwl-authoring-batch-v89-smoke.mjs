#!/usr/bin/env node
/** Full-stack authoring batch v89 (G2041): v88 + Month 2–3 gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV88Smoke } from "./hub-cwl-authoring-batch-v88-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost88GraduationGate } from "./hub-cwl-fullstack-gates.mjs";
import { runPost80Month2MegaGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V89_KIND = "chrysalis.hub.cwl-authoring-batch-v89";
export const HUB_CWL_AUTHORING_BATCH_V89_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV89Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV88 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV88Smoke(resolvePriorBatchOpts(opts, 88));
  const gate89 = skipPrior
    ? await runPost80Month2MegaGate(opts.repoRoot ? { repoRoot: opts.repoRoot } : {})
    : await runPost88GraduationGate({ repoRoot });
  const ok = batchV88.ok === true && gate89.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V89_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V89_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate89Mode: skipPrior ? "post80-month2-mega" : "post88-graduation",
    batchV88,
    gate89,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV89Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
