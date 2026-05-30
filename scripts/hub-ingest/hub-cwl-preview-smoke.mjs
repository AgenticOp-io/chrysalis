#!/usr/bin/env node
/** CWL preview smoke on plain-php flagship (G234). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCwlPreviewReport } from "./hub-cwl-preview.mjs";
import { exportPhpHubWebir } from "./hub-php-hub-webir.mjs";
import { exportProjectMigrationCwl } from "./hub-project-cwl-export.mjs";

export const HUB_CWL_PREVIEW_SMOKE_KIND = "chrysalis.hub.cwl-preview-smoke";
export const HUB_CWL_PREVIEW_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const defaultFixture = join(scriptRoot, "fixtures/hub-flagship-plain-php");

export async function runCwlPreviewSmoke(projectDir = defaultFixture) {
  const root = resolve(projectDir);
  await exportPhpHubWebir(root);
  await exportProjectMigrationCwl(root, { origin: "php" });
  const preview = await buildCwlPreviewReport(root, { probe: true });
  return {
    kind: HUB_CWL_PREVIEW_SMOKE_KIND,
    schemaVersion: HUB_CWL_PREVIEW_SMOKE_SCHEMA_VERSION,
    ok: preview.ok === true && (preview.routeCount ?? 0) >= 20,
    routeCount: preview.routeCount ?? null,
    holeCount: preview.holeCount ?? null,
    probeStatus: preview.probe?.status ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlPreviewSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
