#!/usr/bin/env node
/** Verify playbooks smoke (G222). */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildVerifyPlaybooksReport, VERIFY_DIVERGENCE_PLAYBOOKS } from "./hub-verify-playbooks.mjs";

export const HUB_VERIFY_PLAYBOOKS_SMOKE_KIND = "chrysalis.hub.verify-playbooks-smoke";
export const HUB_VERIFY_PLAYBOOKS_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const verifySeed = join(scriptRoot, "fixtures/ci/tiny-blog-verify-for-status/summary.json");

export function runVerifyPlaybooksSmoke() {
  const summaryPath = existsSync(verifySeed) ? verifySeed : null;
  const report = buildVerifyPlaybooksReport(summaryPath ?? undefined);
  const ok =
    report.kind === "chrysalis.hub.verify-playbooks" &&
    Object.keys(VERIFY_DIVERGENCE_PLAYBOOKS).length >= 3 &&
    (report.playbooks?.length ?? 0) >= 3;
  return {
    kind: HUB_VERIFY_PLAYBOOKS_SMOKE_KIND,
    schemaVersion: HUB_VERIFY_PLAYBOOKS_SMOKE_SCHEMA_VERSION,
    ok,
    playbookCount: report.playbooks?.length ?? 0,
    verifyCorrectness: report.verifyCorrectness ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = runVerifyPlaybooksSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
