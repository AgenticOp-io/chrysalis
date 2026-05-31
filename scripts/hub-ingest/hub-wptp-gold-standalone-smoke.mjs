#!/usr/bin/env node
/** WPTP gold standalone smoke with honest skip (G335). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runWptpGoldSmoke } from "./hub-wptp-gold-smoke.mjs";

export const HUB_WPTP_GOLD_STANDALONE_KIND = "chrysalis.hub.wptp-gold-standalone-smoke";
export const HUB_WPTP_GOLD_STANDALONE_SCHEMA_VERSION = 1;

export function runWptpGoldStandaloneSmoke() {
  const wptp = runWptpGoldSmoke();
  return {
    kind: HUB_WPTP_GOLD_STANDALONE_KIND,
    schemaVersion: HUB_WPTP_GOLD_STANDALONE_SCHEMA_VERSION,
    ok: wptp.ok === true || wptp.skip != null,
    skip: wptp.skip ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = runWptpGoldStandaloneSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
