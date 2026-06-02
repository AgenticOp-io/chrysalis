#!/usr/bin/env node
/** Full-stack authoring batch v109 (G2241): v108 + hub verify-gaps bridge gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV108Smoke } from "./hub-cwl-authoring-batch-v108-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost108GraduationGate } from "./hub-cwl-fullstack-gates.mjs";
import { runPost100HubOpsMegaGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V109_KIND = "chrysalis.hub.cwl-authoring-batch-v109";
export const HUB_CWL_AUTHORING_BATCH_V109_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV109Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV108 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV108Smoke(resolvePriorBatchOpts(opts, 108));
  const gate109 = skipPrior
    ? await runPost100HubOpsMegaGate()
    : await runPost108GraduationGate({ repoRoot });
  const ok = batchV108.ok === true && gate109.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V109_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V109_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate109Mode: skipPrior ? "post100-hub-ops-mega" : "post108-graduation",
    batchV108,
    gate109,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV109Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
