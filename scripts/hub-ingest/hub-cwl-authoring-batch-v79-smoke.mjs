#!/usr/bin/env node
/** Full-stack authoring batch v79 (G1941): v78 + Month 2–3 gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV78Smoke } from "./hub-cwl-authoring-batch-v78-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost78GraduationGate } from "./hub-cwl-fullstack-gates.mjs";
import { runSvelteDeepCwlExportGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V79_KIND = "chrysalis.hub.cwl-authoring-batch-v79";
export const HUB_CWL_AUTHORING_BATCH_V79_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV79Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV78 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV78Smoke(resolvePriorBatchOpts(opts, 78));
  const gate79 = skipPrior
    ? await runSvelteDeepCwlExportGate(opts.repoRoot ? { repoRoot: opts.repoRoot } : {})
    : await runPost78GraduationGate({ repoRoot });
  const ok = batchV78.ok === true && gate79.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V79_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V79_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate79Mode: skipPrior ? "svelte-deep-export" : "post78-graduation",
    batchV78,
    gate79,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV79Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
