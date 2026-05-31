#!/usr/bin/env node
/** Origin depth ultra batch: plain-php + symfony + express + tiny-blog depth (G422). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runPlainPhpDepthBatchSmoke } from "./hub-plain-php-depth-batch-smoke.mjs";
import { runSymfonyDepthBatchSmoke } from "./hub-symfony-depth-batch-smoke.mjs";
import { runExpressDepthBatchSmoke } from "./hub-express-depth-batch-smoke.mjs";
import { runTinyBlogDepthBatchSmoke } from "./hub-tiny-blog-depth-batch-smoke.mjs";

export const HUB_ORIGIN_DEPTH_ULTRA_BATCH_KIND = "chrysalis.hub.origin-depth-ultra-batch-smoke";
export const HUB_ORIGIN_DEPTH_ULTRA_BATCH_SCHEMA_VERSION = 1;

export async function runOriginDepthUltraBatchSmoke() {
  const plainPhp = await runPlainPhpDepthBatchSmoke();
  const symfony = await runSymfonyDepthBatchSmoke();
  const express = await runExpressDepthBatchSmoke();
  const tinyBlog = await runTinyBlogDepthBatchSmoke();
  return {
    kind: HUB_ORIGIN_DEPTH_ULTRA_BATCH_KIND,
    schemaVersion: HUB_ORIGIN_DEPTH_ULTRA_BATCH_SCHEMA_VERSION,
    ok: plainPhp.ok && symfony.ok && express.ok && tinyBlog.ok,
    plainPhp,
    symfony,
    express,
    tinyBlog,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runOriginDepthUltraBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
