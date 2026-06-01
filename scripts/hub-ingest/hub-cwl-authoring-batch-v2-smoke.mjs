#!/usr/bin/env node
/**
 * Full-stack authoring batch v2 (G1175): deep export, nextjs deep, production + hono parity.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlRuntimeHonoParitySmoke } from "./hub-cwl-runtime-hono-parity-smoke.mjs";
import { runCwlRuntimeProductionSmoke } from "./hub-cwl-runtime-production-smoke.mjs";
import { runNextjsDeepSmoke } from "./hub-nextjs-deep-smoke.mjs";
import { runSveltekitDeepCwlExportSmoke } from "./hub-sveltekit-deep-cwl-export-smoke.mjs";

export const HUB_CWL_AUTHORING_BATCH_V2_KIND = "chrysalis.hub.cwl-authoring-batch-v2";
export const HUB_CWL_AUTHORING_BATCH_V2_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV2Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const [deepExport, nextDeep, production, honoParity] = await Promise.all([
    runSveltekitDeepCwlExportSmoke(),
    runNextjsDeepSmoke(),
    runCwlRuntimeProductionSmoke({ repoRoot }),
    runCwlRuntimeHonoParitySmoke({ repoRoot }),
  ]);
  const ok =
    deepExport.ok === true &&
    nextDeep.ok === true &&
    production.ok === true &&
    honoParity.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V2_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V2_SCHEMA_VERSION,
    ok,
    deepExport,
    nextDeep,
    production,
    honoParity,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV2Smoke();
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
