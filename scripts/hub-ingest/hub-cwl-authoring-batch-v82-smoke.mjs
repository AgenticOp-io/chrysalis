#!/usr/bin/env node
/** Full-stack authoring batch v82 (G1971): v81 + Month 2–3 gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV81Smoke } from "./hub-cwl-authoring-batch-v81-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost81GraduationGate } from "./hub-cwl-fullstack-gates.mjs";
import { runChimeraCutoverGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V82_KIND = "chrysalis.hub.cwl-authoring-batch-v82";
export const HUB_CWL_AUTHORING_BATCH_V82_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV82Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV81 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV81Smoke(resolvePriorBatchOpts(opts, 81));
  const gate82 = skipPrior
    ? await runChimeraCutoverGate()
    : await runPost81GraduationGate({ repoRoot });
  const ok = batchV81.ok === true && gate82.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V82_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V82_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate82Mode: skipPrior ? "chimera-cutover" : "post81-graduation",
    batchV81,
    gate82,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV82Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
