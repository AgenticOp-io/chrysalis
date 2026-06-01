#!/usr/bin/env node
/**
 * Full-stack flagship live HTTP verify smoke (G1161): emit hono/fastify + chrysalis verify --base-url.
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runProjectVerifyHttp } from "./hub-verify-http.mjs";

export const HUB_CWL_FLAGSHIP_HTTP_VERIFY_KIND = "chrysalis.hub.cwl-fullstack-flagship-http-verify";
export const HUB_CWL_FLAGSHIP_HTTP_VERIFY_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const goldFixture = join(scriptRoot, "fixtures/hub-flagship-cwl-fullstack");

/**
 * @param {object} [opts]
 */
export async function runCwlFullstackFlagshipHttpVerify(opts = {}) {
  const fixture = resolve(opts.fixture ?? goldFixture);
  const base = {
    kind: HUB_CWL_FLAGSHIP_HTTP_VERIFY_KIND,
    schemaVersion: HUB_CWL_FLAGSHIP_HTTP_VERIFY_SCHEMA_VERSION,
    fixture: "fixtures/hub-flagship-cwl-fullstack",
    ok: false,
  };

  /** @type {Record<string, Record<string, unknown>>} */
  const targets = {};
  let ok = true;
  for (const target of ["hono", "fastify"]) {
    const report = await runProjectVerifyHttp(fixture, {
      origin: "cwl",
      target,
      repoRoot: scriptRoot,
      threshold: 1,
    });
    targets[target] = report;
    if (report.ok !== true && !report.skip) ok = false;
    if (report.skip) ok = false;
  }

  return {
    ...base,
    ok,
    targets,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlFullstackFlagshipHttpVerify();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok && !report.skip) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
