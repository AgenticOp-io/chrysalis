#!/usr/bin/env node
/** Tiny-blog delivery standalone batch smoke (G329). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runHubEvidenceLive } from "./hub-evidence-live.mjs";
import { runHubTranslateE2eSmoke } from "./hub-translate-e2e-smoke.mjs";
import { runMigrationAssessmentSmoke } from "./hub-migration-assessment-smoke.mjs";

export const HUB_TINY_BLOG_DELIVERY_BATCH_KIND = "chrysalis.hub.tiny-blog-delivery-batch-smoke";
export const HUB_TINY_BLOG_DELIVERY_BATCH_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const tinyBlogFixture = join(scriptRoot, "fixtures/tiny-blog");

export async function runTinyBlogDeliveryBatchSmoke() {
  const evidenceLive = await runHubEvidenceLive(tinyBlogFixture, { profile: "tinyBlog" });
  const translateE2e = runHubTranslateE2eSmoke({ variant: "tinyBlog" });
  const migrationAssessment = await runMigrationAssessmentSmoke(tinyBlogFixture);
  const evidenceOk = evidenceLive.ok === true || evidenceLive.skip != null;
  const translateOk =
    translateE2e.ok === true ||
    translateE2e.skip === "missing-cli-dist" ||
    translateE2e.skip === "missing-routes-manifest";
  return {
    kind: HUB_TINY_BLOG_DELIVERY_BATCH_KIND,
    schemaVersion: HUB_TINY_BLOG_DELIVERY_BATCH_SCHEMA_VERSION,
    ok: evidenceOk && translateOk && migrationAssessment.ok === true,
    evidenceLive,
    translateE2e,
    migrationAssessment,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runTinyBlogDeliveryBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
