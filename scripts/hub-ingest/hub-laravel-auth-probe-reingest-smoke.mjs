#!/usr/bin/env node
/** Laravel auth-probe + backlog → strict reingest + verify replay/closure (G934). */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runGapReingestBatchSmoke } from "./hub-gap-reingest-batch-smoke.mjs";

export const HUB_LARAVEL_AUTH_PROBE_REINGEST_KIND = "chrysalis.hub.laravel-auth-probe-reingest-smoke";
export const HUB_LARAVEL_AUTH_PROBE_REINGEST_SCHEMA_VERSION = 3;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliBin = join(scriptRoot, "packages/cli/dist/bin.js");

export async function runLaravelAuthProbeReingestSmoke() {
  const prevStrict = process.env.CHRYSALIS_HUB_GAP_REINGEST_STRICT;
  const prevReingest = process.env.CHRYSALIS_HUB_GAP_REINGEST;
  const prevVerifyReplay = process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_REPLAY;
  const prevVerifyClosure = process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_CLOSURE;
  process.env.CHRYSALIS_HUB_GAP_REINGEST_STRICT = "1";
  process.env.CHRYSALIS_HUB_GAP_REINGEST = "1";
  if (process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_REPLAY !== "1") {
    process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_CLOSURE = "1";
  }
  try {
    const report = await runGapReingestBatchSmoke();
    const cliAvailable = existsSync(cliBin);
    const strictOk =
      cliAvailable &&
      report.reingest?.ran === true &&
      report.reingest?.ok === true &&
      (report.reingest?.exitCode ?? 1) === 0;
    const verifyReplayOk =
      report.verifyReplay?.applied === true &&
      report.verifyReplay?.ok === true &&
      (report.verifyReplay?.correctnessAfter ?? 0) >= 1;
    const verifyClosureOk =
      report.verifyClosure?.applied === true &&
      report.verifyClosure?.ok === true &&
      (report.verifyClosure?.correctnessAfter ?? 0) >= 1;
    const postVerifyOk = verifyReplayOk || verifyClosureOk;
    return {
      kind: HUB_LARAVEL_AUTH_PROBE_REINGEST_KIND,
      schemaVersion: HUB_LARAVEL_AUTH_PROBE_REINGEST_SCHEMA_VERSION,
      ok: report.remediation?.ok === true && strictOk && postVerifyOk,
      cliAvailable,
      fixture: report.fixture ?? "fixtures/laravel-auth-probe",
      remediation: report.remediation,
      reingest: report.reingest,
      verifyClosure: report.verifyClosure,
      verifyReplay: report.verifyReplay,
      generatedAt: new Date().toISOString(),
    };
  } finally {
    if (prevStrict === undefined) delete process.env.CHRYSALIS_HUB_GAP_REINGEST_STRICT;
    else process.env.CHRYSALIS_HUB_GAP_REINGEST_STRICT = prevStrict;
    if (prevReingest === undefined) delete process.env.CHRYSALIS_HUB_GAP_REINGEST;
    else process.env.CHRYSALIS_HUB_GAP_REINGEST = prevReingest;
    if (prevVerifyReplay === undefined) delete process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_REPLAY;
    else process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_REPLAY = prevVerifyReplay;
    if (prevVerifyClosure === undefined) delete process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_CLOSURE;
    else process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_CLOSURE = prevVerifyClosure;
  }
}

async function main() {
  const report = await runLaravelAuthProbeReingestSmoke();
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
