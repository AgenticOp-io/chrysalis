#!/usr/bin/env node
/** Plain-php + symfony + express HTTP oracle verify batch (G956). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runFlagshipVerifyHttp } from "./hub-flagship-verify-http.mjs";

export const HUB_FLAGSHIP_VERIFY_HTTP_BATCH_KIND = "chrysalis.hub.flagship-verify-http-batch-smoke";
export const HUB_FLAGSHIP_VERIFY_HTTP_BATCH_SCHEMA_VERSION = 1;

export async function runFlagshipVerifyHttpBatchSmoke() {
  const plainPhp = await runFlagshipVerifyHttp(undefined, { profile: "plainPhp" });
  const symfony = await runFlagshipVerifyHttp(undefined, { profile: "symfony" });
  const express = await runFlagshipVerifyHttp(undefined, { profile: "express" });
  return {
    kind: HUB_FLAGSHIP_VERIFY_HTTP_BATCH_KIND,
    schemaVersion: HUB_FLAGSHIP_VERIFY_HTTP_BATCH_SCHEMA_VERSION,
    ok: plainPhp.ok === true && symfony.ok === true && express.ok === true,
    plainPhp,
    symfony,
    express,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runFlagshipVerifyHttpBatchSmoke();
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
