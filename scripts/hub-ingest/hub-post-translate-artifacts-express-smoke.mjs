#!/usr/bin/env node
/** Post-translate artifacts smoke on Express flagship (G297). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureProjectWebir } from "./hub-project-to-cwl-gates.mjs";
import { writeHubPostTranslateArtifacts } from "./hub-post-translate-artifacts.mjs";

export const HUB_POST_TRANSLATE_ARTIFACTS_EXPRESS_SMOKE_KIND = "chrysalis.hub.post-translate-artifacts-express-smoke";
export const HUB_POST_TRANSLATE_ARTIFACTS_EXPRESS_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const expressFixture = join(scriptRoot, "fixtures/hub-flagship-express");

export async function runPostTranslateArtifactsExpressSmoke(projectDir = expressFixture) {
  const root = resolve(projectDir);
  await ensureProjectWebir(root, "javascript");
  const bundle = await writeHubPostTranslateArtifacts(root, { origin: "javascript", output: "hono" });
  const written = bundle.written ?? {};
  const ok =
    written.siteIntelligence?.ok === true &&
    written.pathAdvice?.ok === true &&
    written.migrationAssessment?.ok === true &&
    written.chimeraCutover?.ok === true;
  return {
    kind: HUB_POST_TRANSLATE_ARTIFACTS_EXPRESS_SMOKE_KIND,
    schemaVersion: HUB_POST_TRANSLATE_ARTIFACTS_EXPRESS_SMOKE_SCHEMA_VERSION,
    ok,
    written: Object.fromEntries(Object.entries(written).map(([k, v]) => [k, v?.ok === true])),
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runPostTranslateArtifactsExpressSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
