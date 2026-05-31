#!/usr/bin/env node
/** Post-translate artifacts smoke on Symfony flagship (G288). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runPostTranslateArtifactsSmoke } from "./hub-post-translate-artifacts-smoke.mjs";

export const HUB_POST_TRANSLATE_ARTIFACTS_SYMFONY_SMOKE_KIND = "chrysalis.hub.post-translate-artifacts-symfony-smoke";
export const HUB_POST_TRANSLATE_ARTIFACTS_SYMFONY_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const symfonyFixture = join(scriptRoot, "fixtures/hub-flagship-symfony");

export async function runPostTranslateArtifactsSymfonySmoke() {
  const report = await runPostTranslateArtifactsSmoke(symfonyFixture);
  return {
    kind: HUB_POST_TRANSLATE_ARTIFACTS_SYMFONY_SMOKE_KIND,
    schemaVersion: HUB_POST_TRANSLATE_ARTIFACTS_SYMFONY_SMOKE_SCHEMA_VERSION,
    ok: report.ok === true,
    written: report.written ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runPostTranslateArtifactsSymfonySmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
