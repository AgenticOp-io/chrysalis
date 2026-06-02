#!/usr/bin/env node
/**
 * Full-stack authoring batch v63 (G1781): v62 + runtime-cwl parity gate.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV62Smoke } from "./hub-cwl-authoring-batch-v62-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost62CompositeGate, runPost62GraduationGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V63_KIND = "chrysalis.hub.cwl-authoring-batch-v63";
export const HUB_CWL_AUTHORING_BATCH_V63_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV63Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV62 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV62Smoke(resolvePriorBatchOpts(opts, 62));
  const gate63 = skipPrior
    ? await runPost62CompositeGate({ repoRoot })
    : await runPost62GraduationGate({ repoRoot });
  const ok = batchV62.ok === true && gate63.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V63_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V63_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate63Mode: skipPrior ? "post62-composite" : "post62-graduation",
    batchV62,
    gate63,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV63Smoke();
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
