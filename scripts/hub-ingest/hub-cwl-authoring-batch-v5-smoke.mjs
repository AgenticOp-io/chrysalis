#!/usr/bin/env node
/**
 * Full-stack authoring batch v5 (G1204): v4 + HTML roundtrip + deep export slug field.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV4Smoke } from "./hub-cwl-authoring-batch-v4-smoke.mjs";
import { runCwlHtmlRoundtripSmoke } from "./hub-cwl-html-roundtrip-smoke.mjs";
import { runCwlFullstackFlagshipHttpVerify } from "./hub-cwl-fullstack-flagship-http-verify-smoke.mjs";

export const HUB_CWL_AUTHORING_BATCH_V5_KIND = "chrysalis.hub.cwl-authoring-batch-v5";
export const HUB_CWL_AUTHORING_BATCH_V5_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const deepExport = join(scriptRoot, "fixtures/hub-gold-svelte-kit-deep/generated/cwl/routes.cwl");

export async function runCwlAuthoringBatchV5Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const [batchV4, htmlRoundtrip, httpVerify] = await Promise.all([
    runCwlAuthoringBatchV4Smoke({ repoRoot }),
    runCwlHtmlRoundtripSmoke(),
    runCwlFullstackFlagshipHttpVerify(),
  ]);
  let deepExportOk = false;
  try {
    const { runSveltekitDeepCwlExportSmoke } = await import("./hub-sveltekit-deep-cwl-export-smoke.mjs");
    const exported = await runSveltekitDeepCwlExportSmoke();
    if (exported.ok && existsSync(deepExport)) {
      const text = readFileSync(deepExport, "utf8");
      deepExportOk = text.includes("/blog/") && text.includes("slug: slug");
    }
  } catch {
    deepExportOk = false;
  }
  const ok = batchV4.ok === true && htmlRoundtrip.ok === true && httpVerify.ok === true && deepExportOk;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V5_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V5_SCHEMA_VERSION,
    ok,
    batchV4,
    htmlRoundtrip,
    httpVerify,
    deepExportOk,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV5Smoke();
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
