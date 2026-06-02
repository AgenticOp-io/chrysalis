#!/usr/bin/env node
/** Full-stack authoring batch v69 (G1841): v68 + dual-backend emit verify mega. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV68Smoke } from "./hub-cwl-authoring-batch-v68-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runAuthoringEmitVerifyMegaGate,
  runPost68GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V69_KIND = "chrysalis.hub.cwl-authoring-batch-v69";
export const HUB_CWL_AUTHORING_BATCH_V69_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV69Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV68 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV68Smoke(resolvePriorBatchOpts(opts, 68));
  const gate69 = skipPrior
    ? await runAuthoringEmitVerifyMegaGate({ repoRoot })
    : await runPost68GraduationGate({ repoRoot });
  const ok = batchV68.ok === true && gate69.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V69_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V69_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate69Mode: skipPrior ? "emit-verify-mega" : "post68-graduation",
    batchV68,
    gate69,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV69Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
