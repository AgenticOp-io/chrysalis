#!/usr/bin/env node
/** Tiny-blog oracle batch: evidence live + translate E2E (G342). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runHubEvidenceLive } from "./hub-evidence-live.mjs";
import { runHubTranslateE2eSmoke } from "./hub-translate-e2e-smoke.mjs";

export const HUB_TINY_BLOG_ORACLE_BATCH_KIND = "chrysalis.hub.tiny-blog-oracle-batch-smoke";
export const HUB_TINY_BLOG_ORACLE_BATCH_SCHEMA_VERSION = 1;

export async function runTinyBlogOracleBatchSmoke() {
  const evidenceLive = await runHubEvidenceLive(undefined, { profile: "tinyBlog" });
  const translateE2e = runHubTranslateE2eSmoke({ variant: "tinyBlog" });
  const evidenceOk = evidenceLive.ok === true || evidenceLive.skip != null;
  const translateOk =
    translateE2e.ok === true ||
    translateE2e.skip === "missing-cli-dist" ||
    translateE2e.skip === "missing-routes-manifest";
  return {
    kind: HUB_TINY_BLOG_ORACLE_BATCH_KIND,
    schemaVersion: HUB_TINY_BLOG_ORACLE_BATCH_SCHEMA_VERSION,
    ok: evidenceOk && translateOk,
    evidenceLive,
    translateE2e,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runTinyBlogOracleBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
