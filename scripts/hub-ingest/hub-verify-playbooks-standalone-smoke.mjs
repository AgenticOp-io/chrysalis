#!/usr/bin/env node
/** Verify playbooks standalone smoke (G337). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runVerifyPlaybooksSmoke } from "./hub-verify-playbooks-smoke.mjs";

export const HUB_VERIFY_PLAYBOOKS_STANDALONE_KIND = "chrysalis.hub.verify-playbooks-standalone-smoke";
export const HUB_VERIFY_PLAYBOOKS_STANDALONE_SCHEMA_VERSION = 1;

export function runVerifyPlaybooksStandaloneSmoke() {
  const playbooks = runVerifyPlaybooksSmoke();
  return {
    kind: HUB_VERIFY_PLAYBOOKS_STANDALONE_KIND,
    schemaVersion: HUB_VERIFY_PLAYBOOKS_STANDALONE_SCHEMA_VERSION,
    ok: playbooks.ok === true,
    playbookCount: playbooks.playbookCount ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = runVerifyPlaybooksStandaloneSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
