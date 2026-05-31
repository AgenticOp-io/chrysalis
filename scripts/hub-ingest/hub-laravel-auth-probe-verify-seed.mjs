#!/usr/bin/env node
/** Seed laravel-auth-probe verify summary from resolved CI fixture (G891). */
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const HUB_LARAVEL_AUTH_PROBE_VERIFY_SEED_KIND = "chrysalis.hub.laravel-auth-probe-verify-seed";
export const HUB_LARAVEL_AUTH_PROBE_VERIFY_SEED_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const authProbeFixture = join(scriptRoot, "fixtures/laravel-auth-probe");
const verifyResolved = join(scriptRoot, "fixtures/hub-laravel-verify-gaps/summary.json");

/**
 * @param {string} [projectDir] defaults to fixtures/laravel-auth-probe
 */
export function seedLaravelAuthProbeVerifyReport(projectDir = authProbeFixture) {
  const root = resolve(projectDir);
  if (!existsSync(verifyResolved)) {
    return {
      kind: HUB_LARAVEL_AUTH_PROBE_VERIFY_SEED_KIND,
      schemaVersion: HUB_LARAVEL_AUTH_PROBE_VERIFY_SEED_SCHEMA_VERSION,
      ok: false,
      skip: "no-verify-resolved-fixture",
      fixture: "fixtures/laravel-auth-probe",
    };
  }
  const destDir = join(root, "reports", "verify");
  mkdirSync(destDir, { recursive: true });
  const dest = join(destDir, "summary.json");
  copyFileSync(verifyResolved, dest);
  const summary = JSON.parse(readFileSync(verifyResolved, "utf8"));
  return {
    kind: HUB_LARAVEL_AUTH_PROBE_VERIFY_SEED_KIND,
    schemaVersion: HUB_LARAVEL_AUTH_PROBE_VERIFY_SEED_SCHEMA_VERSION,
    ok: true,
    fixture: root === authProbeFixture ? "fixtures/laravel-auth-probe" : root,
    summaryPath: dest,
    correctness: summary.aggregate?.correctness ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = seedLaravelAuthProbeVerifyReport();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
