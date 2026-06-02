#!/usr/bin/env node
/** Full-stack authoring batch v87 (G2021): v86 + Month 2–3 gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV86Smoke } from "./hub-cwl-authoring-batch-v86-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost86GraduationGate } from "./hub-cwl-fullstack-gates.mjs";
import { runCwlFullstackRoundtripGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V87_KIND = "chrysalis.hub.cwl-authoring-batch-v87";
export const HUB_CWL_AUTHORING_BATCH_V87_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV87Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV86 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV86Smoke(resolvePriorBatchOpts(opts, 86));
  const gate87 = skipPrior
    ? await runCwlFullstackRoundtripGate(opts.repoRoot ? { repoRoot: opts.repoRoot } : {})
    : await runPost86GraduationGate({ repoRoot });
  const ok = batchV86.ok === true && gate87.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V87_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V87_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate87Mode: skipPrior ? "fullstack-roundtrip" : "post86-graduation",
    batchV86,
    gate87,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV87Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
