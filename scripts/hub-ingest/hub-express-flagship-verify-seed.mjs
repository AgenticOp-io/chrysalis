#!/usr/bin/env node
/** Seed express flagship verify summary from committed CI fixture (G802). */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const HUB_EXPRESS_FLAGSHIP_VERIFY_SEED_KIND = "chrysalis.hub.express-flagship-verify-seed";
export const HUB_EXPRESS_FLAGSHIP_VERIFY_SEED_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const expressFixture = join(scriptRoot, "fixtures/hub-flagship-express");
const verifySeed = join(scriptRoot, "fixtures/ci/hub-flagship-express-verify-for-status/summary.json");

export function ensureExpressFlagshipVerifyReport() {
  if (!existsSync(verifySeed)) {
    return {
      kind: HUB_EXPRESS_FLAGSHIP_VERIFY_SEED_KIND,
      schemaVersion: HUB_EXPRESS_FLAGSHIP_VERIFY_SEED_SCHEMA_VERSION,
      ok: false,
      skip: "no-verify-seed",
      fixture: "fixtures/hub-flagship-express",
    };
  }
  const destDir = join(expressFixture, "reports", "verify");
  mkdirSync(destDir, { recursive: true });
  const dest = join(destDir, "summary.json");
  copyFileSync(verifySeed, dest);
  return {
    kind: HUB_EXPRESS_FLAGSHIP_VERIFY_SEED_KIND,
    schemaVersion: HUB_EXPRESS_FLAGSHIP_VERIFY_SEED_SCHEMA_VERSION,
    ok: true,
    fixture: "fixtures/hub-flagship-express",
    summaryPath: dest,
    correctness: 1,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = ensureExpressFlagshipVerifyReport();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
