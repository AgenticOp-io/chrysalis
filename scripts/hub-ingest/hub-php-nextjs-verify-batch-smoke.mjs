#!/usr/bin/env node
/** PHP Next.js trace verify batch: tiny-blog + both PHP flagships (G651). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  runPhpNextjsVerify,
  runPhpNextjsFlagshipVerify,
  runPhpNextjsSymfonyFlagshipVerify,
} from "./hub-php-nextjs-verify.mjs";

export const HUB_PHP_NEXTJS_VERIFY_BATCH_KIND = "chrysalis.hub.php-nextjs-verify-batch-smoke";
export const HUB_PHP_NEXTJS_VERIFY_BATCH_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const tinyBlogDir = join(scriptRoot, "fixtures/tiny-blog");

function nextjsOk(report) {
  return report.ok === true || report.skip === "no-wptp-emit-nextjs";
}

export async function runPhpNextjsVerifyBatchSmoke() {
  const tinyBlog = await runPhpNextjsVerify(tinyBlogDir, { label: "fixtures/tiny-blog" });
  const plainPhpFlagship = await runPhpNextjsFlagshipVerify();
  const symfonyFlagship = await runPhpNextjsSymfonyFlagshipVerify();
  const ok = nextjsOk(tinyBlog) && nextjsOk(plainPhpFlagship) && nextjsOk(symfonyFlagship);
  return {
    kind: HUB_PHP_NEXTJS_VERIFY_BATCH_KIND,
    schemaVersion: HUB_PHP_NEXTJS_VERIFY_BATCH_SCHEMA_VERSION,
    ok,
    tinyBlog,
    plainPhpFlagship,
    symfonyFlagship,
    wptpEmitNextjsAvailable: tinyBlog.wptpEmitNextjsAvailable === true,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runPhpNextjsVerifyBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
