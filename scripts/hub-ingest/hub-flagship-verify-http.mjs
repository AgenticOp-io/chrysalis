#!/usr/bin/env node
/** Per-flagship HTTP oracle verify (G955). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runProjectVerifyHttp } from "./hub-verify-http.mjs";
import { inferHubProjectOrigin } from "./hub-verify-replay.mjs";
import { FLAGSHIP_VERIFY_GAPS_FIXTURES } from "./hub-flagship-verify-gaps-standalone-smoke.mjs";

export const HUB_FLAGSHIP_VERIFY_HTTP_KIND = "chrysalis.hub.flagship-verify-http";
export const HUB_FLAGSHIP_VERIFY_HTTP_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * @param {string} [projectDir]
 * @param {{ profile?: keyof typeof FLAGSHIP_VERIFY_GAPS_FIXTURES, target?: string }} [opts]
 */
export async function runFlagshipVerifyHttp(projectDir, opts = {}) {
  const profile = opts.profile ?? "plainPhp";
  const fixture = FLAGSHIP_VERIFY_GAPS_FIXTURES[profile] ?? FLAGSHIP_VERIFY_GAPS_FIXTURES.plainPhp;
  const root = resolve(projectDir ?? join(scriptRoot, fixture.rel));
  const origin = inferHubProjectOrigin(root);
  const target = opts.target ?? "hono";
  const http = await runProjectVerifyHttp(root, { origin, target });
  return {
    kind: HUB_FLAGSHIP_VERIFY_HTTP_KIND,
    schemaVersion: HUB_FLAGSHIP_VERIFY_HTTP_SCHEMA_VERSION,
    profile,
    fixture: fixture.rel,
    origin,
    target,
    ok: http.ok === true,
    correctness: http.correctness ?? null,
    skip: http.skip ?? null,
    routeCount: http.routeCount ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runFlagshipVerifyHttp();
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
