#!/usr/bin/env node
/** Database detect smoke against tier-1 catalog (G237). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { detectDatabasesFromOriginServices } from "./hub-detect-databases.mjs";
import { buildWebDatabaseCatalogReport } from "./hub-web-databases.mjs";

export const HUB_DETECT_DATABASES_SMOKE_KIND = "chrysalis.hub.detect-databases-smoke";
export const HUB_DETECT_DATABASES_SMOKE_SCHEMA_VERSION = 1;

export function runDetectDatabasesSmoke() {
  const catalog = buildWebDatabaseCatalogReport();
  const detected = detectDatabasesFromOriginServices({
    mysql: { driver: "mysql", dsn: "mysql://127.0.0.1:3306/app" },
    redis: { url: "redis://127.0.0.1:6379" },
  });
  return {
    kind: HUB_DETECT_DATABASES_SMOKE_KIND,
    schemaVersion: HUB_DETECT_DATABASES_SMOKE_SCHEMA_VERSION,
    ok: catalog.count >= 20 && detected.length >= 2,
    catalogCount: catalog.count,
    detectedIds: detected,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = runDetectDatabasesSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
