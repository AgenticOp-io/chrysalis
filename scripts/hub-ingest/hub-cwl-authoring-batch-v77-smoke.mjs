#!/usr/bin/env node
/** Full-stack authoring batch v77 (G1921): v76 + Month 2–3 gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV76Smoke } from "./hub-cwl-authoring-batch-v76-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost76GraduationGate } from "./hub-cwl-fullstack-gates.mjs";
import { runNextjsSearchParamsExportGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V77_KIND = "chrysalis.hub.cwl-authoring-batch-v77";
export const HUB_CWL_AUTHORING_BATCH_V77_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV77Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV76 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV76Smoke(resolvePriorBatchOpts(opts, 76));
  const gate77 = skipPrior
    ? await runNextjsSearchParamsExportGate()
    : await runPost76GraduationGate({ repoRoot });
  const ok = batchV76.ok === true && gate77.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V77_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V77_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate77Mode: skipPrior ? "nextjs-search-export" : "post76-graduation",
    batchV76,
    gate77,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV77Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
