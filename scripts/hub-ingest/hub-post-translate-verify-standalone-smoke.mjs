#!/usr/bin/env node
/** Post-translate verify standalone smoke (G338). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runPostTranslateVerifySmoke } from "./hub-post-translate-verify-smoke.mjs";

export const HUB_POST_TRANSLATE_VERIFY_STANDALONE_KIND = "chrysalis.hub.post-translate-verify-standalone-smoke";
export const HUB_POST_TRANSLATE_VERIFY_STANDALONE_SCHEMA_VERSION = 1;

export async function runPostTranslateVerifyStandaloneSmoke() {
  const verify = await runPostTranslateVerifySmoke();
  return {
    kind: HUB_POST_TRANSLATE_VERIFY_STANDALONE_KIND,
    schemaVersion: HUB_POST_TRANSLATE_VERIFY_STANDALONE_SCHEMA_VERSION,
    ok: verify.ok === true,
    skip: verify.skip ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runPostTranslateVerifyStandaloneSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
