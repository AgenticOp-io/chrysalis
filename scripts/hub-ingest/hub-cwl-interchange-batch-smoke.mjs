#!/usr/bin/env node
/** CWL interchange batch: preview + openapi + diff + middleware (G303/G318). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlPreviewSmoke } from "./hub-cwl-preview-smoke.mjs";
import { runCwlOpenapiSmoke } from "./hub-cwl-openapi-smoke.mjs";
import { runCwlDiffSmoke } from "./hub-cwl-diff-smoke.mjs";
import { runCwlMiddlewareSmoke } from "./hub-cwl-middleware-smoke.mjs";

export const HUB_CWL_INTERCHANGE_BATCH_KIND = "chrysalis.hub.cwl-interchange-batch-smoke";
export const HUB_CWL_INTERCHANGE_BATCH_SCHEMA_VERSION = 1;

export async function runCwlInterchangeBatchSmoke() {
  const preview = await runCwlPreviewSmoke();
  const openapi = await runCwlOpenapiSmoke();
  const diff = runCwlDiffSmoke();
  const middleware = await runCwlMiddlewareSmoke();
  return {
    kind: HUB_CWL_INTERCHANGE_BATCH_KIND,
    schemaVersion: HUB_CWL_INTERCHANGE_BATCH_SCHEMA_VERSION,
    ok: preview.ok && openapi.ok && diff.ok && middleware.ok,
    preview,
    openapi,
    diff,
    middleware,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlInterchangeBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
