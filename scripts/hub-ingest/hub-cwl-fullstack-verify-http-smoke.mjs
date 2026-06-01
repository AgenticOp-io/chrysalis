#!/usr/bin/env node
/**
 * HTTP oracle verify on CWL full-stack flagship (G1660): hono + fastify emit targets.
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runProjectVerifyHttp } from "./hub-verify-http.mjs";

export const HUB_CWL_FULLSTACK_VERIFY_HTTP_KIND = "chrysalis.hub.cwl-fullstack-verify-http-smoke";
export const HUB_CWL_FULLSTACK_VERIFY_HTTP_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const flagshipDir = join(scriptRoot, "fixtures/hub-flagship-cwl-fullstack");

export async function runCwlFullstackVerifyHttpSmoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const hono = await runProjectVerifyHttp(flagshipDir, {
    origin: "cwl",
    target: "hono",
    repoRoot,
    threshold: opts.threshold ?? 1,
  });
  const fastify = await runProjectVerifyHttp(flagshipDir, {
    origin: "cwl",
    target: "fastify",
    repoRoot,
    threshold: opts.threshold ?? 1,
  });
  return {
    kind: HUB_CWL_FULLSTACK_VERIFY_HTTP_KIND,
    schemaVersion: HUB_CWL_FULLSTACK_VERIFY_HTTP_SCHEMA_VERSION,
    ok: hono.ok === true && fastify.ok === true,
    hono,
    fastify,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlFullstackVerifyHttpSmoke();
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
