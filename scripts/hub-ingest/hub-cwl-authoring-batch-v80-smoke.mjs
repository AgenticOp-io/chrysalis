#!/usr/bin/env node
/** Full-stack authoring batch v80 (G1951): v79 + Month 2–3 gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV79Smoke } from "./hub-cwl-authoring-batch-v79-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost79GraduationGate } from "./hub-cwl-fullstack-gates.mjs";
import { runNextjsDeepCwlExportGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V80_KIND = "chrysalis.hub.cwl-authoring-batch-v80";
export const HUB_CWL_AUTHORING_BATCH_V80_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV80Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV79 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV79Smoke(resolvePriorBatchOpts(opts, 79));
  const gate80 = skipPrior
    ? await runNextjsDeepCwlExportGate(opts.repoRoot ? { repoRoot: opts.repoRoot } : {})
    : await runPost79GraduationGate({ repoRoot });
  const ok = batchV79.ok === true && gate80.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V80_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V80_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate80Mode: skipPrior ? "nextjs-deep-export" : "post79-graduation",
    batchV79,
    gate80,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV80Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
