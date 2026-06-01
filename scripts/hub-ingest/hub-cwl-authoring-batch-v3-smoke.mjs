#!/usr/bin/env node
/**
 * Full-stack authoring batch v3 (G1186): queue-3 gates (page-load, next load export, shop lift).
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV2Smoke } from "./hub-cwl-authoring-batch-v2-smoke.mjs";
import { runCwlPageLoadParitySmoke } from "./hub-cwl-page-load-parity-smoke.mjs";
import { runNextjsDeepCwlExportSmoke } from "./hub-nextjs-deep-cwl-export-smoke.mjs";
import { runSveltekitDeepSmoke } from "./hub-sveltekit-deep-smoke.mjs";

export const HUB_CWL_AUTHORING_BATCH_V3_KIND = "chrysalis.hub.cwl-authoring-batch-v3";
export const HUB_CWL_AUTHORING_BATCH_V3_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV3Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const [batchV2, pageLoad, nextExport, svelteDeep] = await Promise.all([
    runCwlAuthoringBatchV2Smoke({ repoRoot }),
    runCwlPageLoadParitySmoke({ repoRoot }),
    runNextjsDeepCwlExportSmoke(),
    runSveltekitDeepSmoke(),
  ]);
  const ok =
    batchV2.ok === true &&
    pageLoad.ok === true &&
    nextExport.ok === true &&
    svelteDeep.ok === true &&
    svelteDeep.shopLifted === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V3_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V3_SCHEMA_VERSION,
    ok,
    batchV2,
    pageLoad,
    nextExport,
    svelteDeep,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV3Smoke();
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
