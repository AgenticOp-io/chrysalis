#!/usr/bin/env node
/** Full-stack authoring batch v224 (G3539): v223 + Post-69 composite replay depth. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV223Smoke } from "./hub-cwl-authoring-batch-v223-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost224GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V224_KIND = "chrysalis.hub.cwl-authoring-batch-v224";
export const HUB_CWL_AUTHORING_BATCH_V224_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV224Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV223 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV223Smoke(resolvePriorBatchOpts(opts, 223));
  const gate224 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost224GraduationGate({ repoRoot });
  const ok = batchV223.ok === true && gate224.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V224_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V224_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate224Mode: skipPrior ? "evidence-trend" : "post224-graduation",
    batchV223,
    gate224,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV224Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
