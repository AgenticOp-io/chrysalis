#!/usr/bin/env node
/** Post-translate artifact bundle smoke (G240). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeHubPostTranslateArtifacts } from "./hub-post-translate-artifacts.mjs";
import { exportPhpHubWebir } from "./hub-php-hub-webir.mjs";

export const HUB_POST_TRANSLATE_ARTIFACTS_SMOKE_KIND = "chrysalis.hub.post-translate-artifacts-smoke";
export const HUB_POST_TRANSLATE_ARTIFACTS_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const defaultFixture = join(scriptRoot, "fixtures/hub-flagship-plain-php");

export async function runPostTranslateArtifactsSmoke(projectDir = defaultFixture) {
  const root = resolve(projectDir);
  await exportPhpHubWebir(root);
  const bundle = await writeHubPostTranslateArtifacts(root, { origin: "php", output: "hono" });
  const written = bundle.written ?? {};
  const ok =
    written.siteIntelligence?.ok === true &&
    written.pathAdvice?.ok === true &&
    written.migrationAssessment?.ok === true &&
    written.chimeraCutover?.ok === true;
  return {
    kind: HUB_POST_TRANSLATE_ARTIFACTS_SMOKE_KIND,
    schemaVersion: HUB_POST_TRANSLATE_ARTIFACTS_SMOKE_SCHEMA_VERSION,
    ok,
    written: Object.fromEntries(Object.entries(written).map(([k, v]) => [k, v?.ok === true])),
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runPostTranslateArtifactsSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
