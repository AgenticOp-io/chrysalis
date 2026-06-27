#!/usr/bin/env node
/** Phase 29b static export gate (G7904). */
import { runWispCwlStaticExport } from "../wisp-cwl-static-export.mjs";

export const WISP_PRODUCTION_COMPLETION_STATIC_EXPORT_KIND =
  "chrysalis.wisp.production-completion-static-export-smoke";

export async function runWispProductionCompletionStaticExportGate() {
  const result = await runWispCwlStaticExport();
  return {
    kind: WISP_PRODUCTION_COMPLETION_STATIC_EXPORT_KIND,
    schemaVersion: 1,
    ok: result.ok === true,
    export: result,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runWispProductionCompletionStaticExportGate();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-production-completion-static-export-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
