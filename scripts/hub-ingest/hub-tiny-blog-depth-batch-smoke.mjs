#!/usr/bin/env node
/** Tiny-blog depth batch: site intel + path advice + project-to-CWL (G400). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runSiteIntelligenceTinyBlogSmoke } from "./hub-site-intelligence-tiny-blog-smoke.mjs";
import { runPathAdviceTinyBlogSmoke } from "./hub-path-advice-tiny-blog-smoke.mjs";
import { runProjectToCwlTinyBlogSmoke } from "./hub-project-to-cwl-tiny-blog-smoke.mjs";

export const HUB_TINY_BLOG_DEPTH_BATCH_KIND = "chrysalis.hub.tiny-blog-depth-batch-smoke";
export const HUB_TINY_BLOG_DEPTH_BATCH_SCHEMA_VERSION = 1;

export async function runTinyBlogDepthBatchSmoke() {
  const siteIntelligence = await runSiteIntelligenceTinyBlogSmoke();
  const pathAdvice = await runPathAdviceTinyBlogSmoke();
  const projectToCwl = await runProjectToCwlTinyBlogSmoke();
  return {
    kind: HUB_TINY_BLOG_DEPTH_BATCH_KIND,
    schemaVersion: HUB_TINY_BLOG_DEPTH_BATCH_SCHEMA_VERSION,
    ok: siteIntelligence.ok && pathAdvice.ok && projectToCwl.ok,
    siteIntelligence,
    pathAdvice,
    projectToCwl,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runTinyBlogDepthBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
