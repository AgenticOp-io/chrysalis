#!/usr/bin/env node
/** CWL OpenAPI export smoke on plain-php flagship (G235). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { exportProjectOpenApi } from "./hub-cwl-openapi-export.mjs";
import { exportPhpHubWebir } from "./hub-php-hub-webir.mjs";

export const HUB_CWL_OPENAPI_SMOKE_KIND = "chrysalis.hub.cwl-openapi-smoke";
export const HUB_CWL_OPENAPI_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const defaultFixture = join(scriptRoot, "fixtures/hub-flagship-plain-php");

export async function runCwlOpenapiSmoke(projectDir = defaultFixture) {
  const root = resolve(projectDir);
  await exportPhpHubWebir(root);
  const report = await exportProjectOpenApi(root, { origin: "php" });
  return {
    kind: HUB_CWL_OPENAPI_SMOKE_KIND,
    schemaVersion: HUB_CWL_OPENAPI_SMOKE_SCHEMA_VERSION,
    ok: report.ok === true && (report.pathCount ?? report.routeCount ?? 0) >= 10,
    routeCount: report.routeCount ?? null,
    pathCount: report.pathCount ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlOpenapiSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
