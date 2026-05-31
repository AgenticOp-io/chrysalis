#!/usr/bin/env node
/** Path advice smoke on tiny-blog fixture (G397). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runPathAdviceSmoke } from "./hub-path-advice-smoke.mjs";

export const HUB_PATH_ADVICE_TINY_BLOG_SMOKE_KIND = "chrysalis.hub.path-advice-tiny-blog-smoke";
export const HUB_PATH_ADVICE_TINY_BLOG_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const tinyBlogFixture = join(scriptRoot, "fixtures/tiny-blog");

export async function runPathAdviceTinyBlogSmoke(projectDir = tinyBlogFixture) {
  const report = await runPathAdviceSmoke(projectDir);
  return {
    kind: HUB_PATH_ADVICE_TINY_BLOG_SMOKE_KIND,
    schemaVersion: HUB_PATH_ADVICE_TINY_BLOG_SMOKE_SCHEMA_VERSION,
    ok: report.ok === true,
    grade: report.grade ?? null,
    programId: report.programId ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runPathAdviceTinyBlogSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
