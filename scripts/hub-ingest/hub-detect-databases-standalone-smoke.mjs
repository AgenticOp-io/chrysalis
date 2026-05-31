#!/usr/bin/env node
/** Detect databases standalone smoke wrapper (G359). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runDetectDatabasesSmoke } from "./hub-detect-databases-smoke.mjs";

export const HUB_DETECT_DATABASES_STANDALONE_KIND = "chrysalis.hub.detect-databases-standalone-smoke";
export const HUB_DETECT_DATABASES_STANDALONE_SCHEMA_VERSION = 1;

export function runDetectDatabasesStandaloneSmoke() {
  const detect = runDetectDatabasesSmoke();
  return {
    kind: HUB_DETECT_DATABASES_STANDALONE_KIND,
    schemaVersion: HUB_DETECT_DATABASES_STANDALONE_SCHEMA_VERSION,
    ok: detect.ok === true,
    catalogCount: detect.catalogCount ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = runDetectDatabasesStandaloneSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
