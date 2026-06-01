#!/usr/bin/env node
/**
 * CWL authoring dev-loop batch smoke (G1155): parity + SvelteKit export + lift depth.
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlRuntimeParitySmoke } from "./hub-cwl-runtime-parity-smoke.mjs";
import { runSveltekitCwlExportSmoke } from "./hub-sveltekit-cwl-export-smoke.mjs";
import { runSvelteKitSmoke } from "./hub-sveltekit-smoke.mjs";

export const HUB_CWL_AUTHORING_BATCH_SMOKE_KIND = "chrysalis.hub.cwl-authoring-batch-smoke";
export const HUB_CWL_AUTHORING_BATCH_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchSmoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const [parity, svelteLift, svelteExport] = await Promise.all([
    runCwlRuntimeParitySmoke({ repoRoot }),
    runSvelteKitSmoke(),
    runSveltekitCwlExportSmoke(),
  ]);
  const ok = parity.ok === true && svelteLift.ok === true && svelteExport.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_SMOKE_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_SMOKE_SCHEMA_VERSION,
    ok,
    parity,
    svelteLift,
    svelteExport,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchSmoke();
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
