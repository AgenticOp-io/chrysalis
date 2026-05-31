#!/usr/bin/env node
/** Post-translate verify smoke on Express flagship (G394). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runPostTranslateVerifySmoke } from "./hub-post-translate-verify-smoke.mjs";

export const HUB_POST_TRANSLATE_VERIFY_EXPRESS_KIND = "chrysalis.hub.post-translate-verify-express-smoke";
export const HUB_POST_TRANSLATE_VERIFY_EXPRESS_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const expressFixture = join(scriptRoot, "fixtures/hub-flagship-express");

export async function runPostTranslateVerifyExpressSmoke(projectDir = expressFixture) {
  const verify = await runPostTranslateVerifySmoke(projectDir);
  return {
    kind: HUB_POST_TRANSLATE_VERIFY_EXPRESS_KIND,
    schemaVersion: HUB_POST_TRANSLATE_VERIFY_EXPRESS_SCHEMA_VERSION,
    ok: verify.ok === true,
    skip: verify.skip ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runPostTranslateVerifyExpressSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
