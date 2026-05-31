#!/usr/bin/env node
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runGapReingestBatchSmoke, HUB_GAP_REINGEST_BATCH_SCHEMA_VERSION } from "./hub-gap-reingest-batch-smoke.mjs";

export const HUB_GAP_REINGEST_STRICT_KIND = "chrysalis.hub.gap-reingest-strict-smoke";
export const HUB_GAP_REINGEST_STRICT_SCHEMA_VERSION = 3;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliBin = join(scriptRoot, "packages/cli/dist/bin.js");

export function runGapReingestStrictSmoke() {
  const strictReingest = process.env.CHRYSALIS_HUB_GAP_REINGEST_STRICT === "1";
  const prev = process.env.CHRYSALIS_HUB_GAP_REINGEST;
  if (strictReingest) {
    process.env.CHRYSALIS_HUB_GAP_REINGEST = "1";
  } else {
    delete process.env.CHRYSALIS_HUB_GAP_REINGEST;
  }
  try {
    const report = runGapReingestBatchSmoke();
    const cliAvailable = existsSync(cliBin);
    let strictOk = true;
    if (strictReingest) {
      strictOk =
        cliAvailable &&
        report.reingest?.ran === true &&
        report.reingest?.ok === true &&
        (report.reingest?.exitCode ?? 1) === 0;
    }
    return {
      kind: HUB_GAP_REINGEST_STRICT_KIND,
      schemaVersion: HUB_GAP_REINGEST_STRICT_SCHEMA_VERSION,
      ok: report.remediation?.ok === true && strictOk,
      batchSchemaVersion: HUB_GAP_REINGEST_BATCH_SCHEMA_VERSION,
      strictReingest,
      cliAvailable,
      remediation: report.remediation,
      reingest: report.reingest,
      requireStrictEnv: "CHRYSALIS_HUB_GAP_REINGEST_STRICT",
      requireReingestEnv: "CHRYSALIS_HUB_GAP_REINGEST",
      generatedAt: new Date().toISOString(),
    };
  } finally {
    if (prev === undefined) delete process.env.CHRYSALIS_HUB_GAP_REINGEST;
    else process.env.CHRYSALIS_HUB_GAP_REINGEST = prev;
  }
}

async function main() {
  const report = runGapReingestStrictSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
