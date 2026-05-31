#!/usr/bin/env node
/** Real trace replay verify for laravel-auth-probe (G922). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runProjectVerifyReplay } from "./hub-verify-replay.mjs";

export const HUB_LARAVEL_AUTH_PROBE_VERIFY_REPLAY_KIND = "chrysalis.hub.laravel-auth-probe-verify-replay";
export const HUB_LARAVEL_AUTH_PROBE_VERIFY_REPLAY_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const authProbeFixture = join(scriptRoot, "fixtures/laravel-auth-probe");

/**
 * @param {string} [projectDir]
 */
export async function runLaravelAuthProbeVerifyReplay(projectDir = authProbeFixture) {
  return runProjectVerifyReplay(projectDir, { origin: "php", target: "hono" });
}

async function main() {
  const report = await runLaravelAuthProbeVerifyReplay();
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
