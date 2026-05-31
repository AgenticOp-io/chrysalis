#!/usr/bin/env node
/** Language compare smoke (G270). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compareHubLanguages } from "./hub-language-compare.mjs";

export const HUB_LANGUAGE_COMPARE_SMOKE_KIND = "chrysalis.hub.language-compare-smoke";
export const HUB_LANGUAGE_COMPARE_SMOKE_SCHEMA_VERSION = 1;

export function runLanguageCompareSmoke() {
  const report = compareHubLanguages("php", ["hono", "fastify", "nextjs"]);
  return {
    kind: HUB_LANGUAGE_COMPARE_SMOKE_KIND,
    schemaVersion: HUB_LANGUAGE_COMPARE_SMOKE_SCHEMA_VERSION,
    ok: report.recommended === "hono" && (report.outputs?.length ?? 0) >= 3,
    recommended: report.recommended ?? null,
    outputCount: report.outputs?.length ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = runLanguageCompareSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
