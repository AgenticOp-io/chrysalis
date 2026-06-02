#!/usr/bin/env node
/** Full-stack authoring batch v81 (G1961): v80 + Month 2–3 gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV80Smoke } from "./hub-cwl-authoring-batch-v80-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost80GraduationGate } from "./hub-cwl-fullstack-gates.mjs";
import { runCwlHtmlInterpolationGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V81_KIND = "chrysalis.hub.cwl-authoring-batch-v81";
export const HUB_CWL_AUTHORING_BATCH_V81_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV81Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV80 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV80Smoke(resolvePriorBatchOpts(opts, 80));
  const gate81 = skipPrior
    ? await runCwlHtmlInterpolationGate(opts.repoRoot ? { repoRoot: opts.repoRoot } : {})
    : await runPost80GraduationGate({ repoRoot });
  const ok = batchV80.ok === true && gate81.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V81_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V81_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate81Mode: skipPrior ? "html-interpolation" : "post80-graduation",
    batchV80,
    gate81,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV81Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
