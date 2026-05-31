#!/usr/bin/env node
/** Post-translate verify smoke on Laravel-min scaffold (G366). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runPostTranslateVerifySmoke } from "./hub-post-translate-verify-smoke.mjs";

export const HUB_POST_TRANSLATE_VERIFY_LARAVEL_MIN_KIND = "chrysalis.hub.post-translate-verify-laravel-min-smoke";
export const HUB_POST_TRANSLATE_VERIFY_LARAVEL_MIN_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const laravelMinFixture = join(scriptRoot, "flagship/laravel-min");

export async function runPostTranslateVerifyLaravelMinSmoke(projectDir = laravelMinFixture) {
  const verify = await runPostTranslateVerifySmoke(projectDir);
  return {
    kind: HUB_POST_TRANSLATE_VERIFY_LARAVEL_MIN_KIND,
    schemaVersion: HUB_POST_TRANSLATE_VERIFY_LARAVEL_MIN_SCHEMA_VERSION,
    ok: verify.ok === true,
    skip: verify.skip ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runPostTranslateVerifyLaravelMinSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
