#!/usr/bin/env node
/** HTTP oracle verify for laravel-auth-probe (G953). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runProjectVerifyHttp } from "./hub-verify-http.mjs";

export const HUB_LARAVEL_AUTH_PROBE_VERIFY_HTTP_KIND = "chrysalis.hub.laravel-auth-probe-verify-http";
export const HUB_LARAVEL_AUTH_PROBE_VERIFY_HTTP_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const authProbeFixture = join(scriptRoot, "fixtures/laravel-auth-probe");

/**
 * @param {string} [projectDir]
 */
export async function runLaravelAuthProbeVerifyHttp(projectDir = authProbeFixture) {
  return runProjectVerifyHttp(projectDir, { origin: "php", target: "hono" });
}

async function main() {
  const report = await runLaravelAuthProbeVerifyHttp();
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
