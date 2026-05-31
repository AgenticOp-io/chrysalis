#!/usr/bin/env node
/** Post-translate artifacts smoke on Laravel-min scaffold (G325). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureProjectWebir } from "./hub-project-to-cwl-gates.mjs";
import { writeHubPostTranslateArtifacts } from "./hub-post-translate-artifacts.mjs";

export const HUB_POST_TRANSLATE_ARTIFACTS_LARAVEL_MIN_SMOKE_KIND = "chrysalis.hub.post-translate-artifacts-laravel-min-smoke";
export const HUB_POST_TRANSLATE_ARTIFACTS_LARAVEL_MIN_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const laravelMinFixture = join(scriptRoot, "flagship/laravel-min");

export async function runPostTranslateArtifactsLaravelMinSmoke(projectDir = laravelMinFixture) {
  const root = resolve(projectDir);
  await ensureProjectWebir(root, "php");
  const bundle = await writeHubPostTranslateArtifacts(root, { origin: "php", output: "hono" });
  const written = bundle.written ?? {};
  const ok =
    written.siteIntelligence?.ok === true &&
    written.pathAdvice?.ok === true &&
    written.migrationAssessment?.ok === true &&
    written.chimeraCutover?.ok === true;
  return {
    kind: HUB_POST_TRANSLATE_ARTIFACTS_LARAVEL_MIN_SMOKE_KIND,
    schemaVersion: HUB_POST_TRANSLATE_ARTIFACTS_LARAVEL_MIN_SMOKE_SCHEMA_VERSION,
    ok,
    written: Object.fromEntries(Object.entries(written).map(([k, v]) => [k, v?.ok === true])),
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runPostTranslateArtifactsLaravelMinSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
