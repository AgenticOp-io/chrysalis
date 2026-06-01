#!/usr/bin/env node
/**
 * Full-stack authoring batch v4 (G1196): HTML interpolation + roundtrip + deep lifts.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV3Smoke } from "./hub-cwl-authoring-batch-v3-smoke.mjs";
import { runCwlHtmlInterpolationSmoke } from "./hub-cwl-html-interpolation-smoke.mjs";
import { runNextjsDeepSmoke } from "./hub-nextjs-deep-smoke.mjs";
import { runSveltekitDeepSmoke } from "./hub-sveltekit-deep-smoke.mjs";

export const HUB_CWL_AUTHORING_BATCH_V4_KIND = "chrysalis.hub.cwl-authoring-batch-v4";
export const HUB_CWL_AUTHORING_BATCH_V4_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV4Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const [batchV3, htmlInterpolation, svelteDeep, nextDeep] = await Promise.all([
    runCwlAuthoringBatchV3Smoke({ repoRoot }),
    runCwlHtmlInterpolationSmoke({ repoRoot }),
    runSveltekitDeepSmoke(),
    runNextjsDeepSmoke(),
  ]);
  const ok =
    batchV3.ok === true &&
    htmlInterpolation.ok === true &&
    svelteDeep.ok === true &&
    nextDeep.ok === true &&
    nextDeep.shopLifted === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V4_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V4_SCHEMA_VERSION,
    ok,
    batchV3,
    htmlInterpolation,
    svelteDeep,
    nextDeep,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV4Smoke();
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
