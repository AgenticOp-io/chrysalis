#!/usr/bin/env node
/** Laravel auth-probe + backlog verify summary → strict reingest exit 0 (G861). */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runGapReingestBatchSmoke } from "./hub-gap-reingest-batch-smoke.mjs";

export const HUB_LARAVEL_AUTH_PROBE_REINGEST_KIND = "chrysalis.hub.laravel-auth-probe-reingest-smoke";
export const HUB_LARAVEL_AUTH_PROBE_REINGEST_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliBin = join(scriptRoot, "packages/cli/dist/bin.js");

export function runLaravelAuthProbeReingestSmoke() {
  const prevStrict = process.env.CHRYSALIS_HUB_GAP_REINGEST_STRICT;
  const prevReingest = process.env.CHRYSALIS_HUB_GAP_REINGEST;
  process.env.CHRYSALIS_HUB_GAP_REINGEST_STRICT = "1";
  process.env.CHRYSALIS_HUB_GAP_REINGEST = "1";
  try {
    const report = runGapReingestBatchSmoke();
    const cliAvailable = existsSync(cliBin);
    const strictOk =
      cliAvailable &&
      report.reingest?.ran === true &&
      report.reingest?.ok === true &&
      (report.reingest?.exitCode ?? 1) === 0;
    return {
      kind: HUB_LARAVEL_AUTH_PROBE_REINGEST_KIND,
      schemaVersion: HUB_LARAVEL_AUTH_PROBE_REINGEST_SCHEMA_VERSION,
      ok: report.remediation?.ok === true && strictOk,
      cliAvailable,
      fixture: report.fixture ?? "fixtures/laravel-auth-probe",
      remediation: report.remediation,
      reingest: report.reingest,
      generatedAt: new Date().toISOString(),
    };
  } finally {
    if (prevStrict === undefined) delete process.env.CHRYSALIS_HUB_GAP_REINGEST_STRICT;
    else process.env.CHRYSALIS_HUB_GAP_REINGEST_STRICT = prevStrict;
    if (prevReingest === undefined) delete process.env.CHRYSALIS_HUB_GAP_REINGEST;
    else process.env.CHRYSALIS_HUB_GAP_REINGEST = prevReingest;
  }
}

async function main() {
  const report = runLaravelAuthProbeReingestSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
