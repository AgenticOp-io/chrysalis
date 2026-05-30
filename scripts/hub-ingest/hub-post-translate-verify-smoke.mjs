#!/usr/bin/env node
/** Post-translate verify smoke — honest skip when traces/base URL absent (G220). */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runHubPostTranslateVerify } from "./hub-post-translate-verify.mjs";

export const HUB_POST_TRANSLATE_VERIFY_SMOKE_KIND = "chrysalis.hub.post-translate-verify-smoke";
export const HUB_POST_TRANSLATE_VERIFY_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const defaultFixture = join(scriptRoot, "fixtures/tiny-blog");

export async function runPostTranslateVerifySmoke(projectDir = defaultFixture) {
  const root = resolve(projectDir);
  const base = {
    kind: HUB_POST_TRANSLATE_VERIFY_SMOKE_KIND,
    schemaVersion: HUB_POST_TRANSLATE_VERIFY_SMOKE_SCHEMA_VERSION,
    fixture: root.includes("tiny-blog") ? "fixtures/tiny-blog" : root,
    ok: false,
  };

  const hasTraces = existsSync(join(root, ".chrysalis", "traces"));
  const hasBaseUrl = Boolean(process.env.CHRYSALIS_HUB_VERIFY_BASE_URL);
  if (!hasTraces || !hasBaseUrl) {
    return {
      ...base,
      ok: true,
      skip: !hasTraces ? "no-traces" : "no-verify-base-url",
      note: "honest skip unless CHRYSALIS_HUB_VERIFY_BASE_URL and .chrysalis/traces exist",
    };
  }

  const result = await runHubPostTranslateVerify(root);
  return {
    ...base,
    ok: result.ok === true || result.skip != null,
    verify: { ok: result.ok === true, skip: result.skip ?? null },
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runPostTranslateVerifySmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok && !report.skip) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
