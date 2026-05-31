#!/usr/bin/env node
/** Strict reingest + resolved verify seed → backlog 0 / correctness 1 (G892). */
import { copyFileSync, cpSync, existsSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { buildProjectVerifyGapsIngestReport } from "./hub-verify-gaps-ingest.mjs";
import { runVerifyGapsIngestAction } from "./hub-verify-gaps-ingest-action.mjs";

export const HUB_LARAVEL_AUTH_PROBE_REINGEST_VERIFY_CLOSURE_KIND =
  "chrysalis.hub.laravel-auth-probe-reingest-verify-closure-smoke";
export const HUB_LARAVEL_AUTH_PROBE_REINGEST_VERIFY_CLOSURE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const backlogSummary = join(scriptRoot, "fixtures/hub-laravel-verify-gaps-backlog/summary.json");
const authProbeFixture = join(scriptRoot, "fixtures/laravel-auth-probe");
const cliBin = join(scriptRoot, "packages/cli/dist/bin.js");

function withBacklogProject(fn) {
  const tmp = mkdtempSync(join(tmpdir(), "chrysalis-auth-probe-closure-"));
  try {
    cpSync(authProbeFixture, tmp, { recursive: true });
    mkdirSync(join(tmp, "reports", "verify"), { recursive: true });
    copyFileSync(backlogSummary, join(tmp, "reports", "verify/summary.json"));
    return fn(tmp);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

export function runLaravelAuthProbeReingestVerifyClosureSmoke() {
  const prevStrict = process.env.CHRYSALIS_HUB_GAP_REINGEST_STRICT;
  const prevReingest = process.env.CHRYSALIS_HUB_GAP_REINGEST;
  const prevVerifyClosure = process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_CLOSURE;
  process.env.CHRYSALIS_HUB_GAP_REINGEST_STRICT = "1";
  process.env.CHRYSALIS_HUB_GAP_REINGEST = "1";
  process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_CLOSURE = "1";
  try {
    if (!existsSync(cliBin)) {
      return {
        kind: HUB_LARAVEL_AUTH_PROBE_REINGEST_VERIFY_CLOSURE_KIND,
        schemaVersion: HUB_LARAVEL_AUTH_PROBE_REINGEST_VERIFY_CLOSURE_SCHEMA_VERSION,
        ok: false,
        skip: "no-cli-bin",
        cliAvailable: false,
        generatedAt: new Date().toISOString(),
      };
    }

    const result = withBacklogProject((projectDir) => {
      const before = buildProjectVerifyGapsIngestReport(projectDir);
      const action = runVerifyGapsIngestAction(projectDir, { reingest: true, cliBin });
      const after = buildProjectVerifyGapsIngestReport(projectDir);
      return { before, action, after };
    });

    const reingestOk =
      result.action.reingest?.ran === true &&
      result.action.reingest?.exitCode === 0 &&
      result.action.ok === true;
    const verifyClosureOk =
      result.action.verifyClosure?.applied === true &&
      result.action.verifyClosure?.ok === true &&
      result.after.backlog.length === 0 &&
      (result.after.verify?.correctness ?? 0) >= 1;

    return {
      kind: HUB_LARAVEL_AUTH_PROBE_REINGEST_VERIFY_CLOSURE_KIND,
      schemaVersion: HUB_LARAVEL_AUTH_PROBE_REINGEST_VERIFY_CLOSURE_SCHEMA_VERSION,
      ok: reingestOk && verifyClosureOk,
      cliAvailable: true,
      fixture: "fixtures/laravel-auth-probe",
      backlogBefore: result.before.backlog.length,
      backlogAfter: result.after.backlog.length,
      correctnessAfter: result.after.verify?.correctness ?? null,
      reingest: {
        ran: result.action.reingest?.ran === true,
        exitCode: result.action.reingest?.exitCode ?? null,
        verifyClosureApplied: result.action.verifyClosure?.applied === true,
      },
      verifyClosure: result.action.verifyClosure ?? null,
      requireVerifyClosureEnv: "CHRYSALIS_HUB_GAP_REINGEST_VERIFY_CLOSURE",
      generatedAt: new Date().toISOString(),
    };
  } finally {
    if (prevStrict === undefined) delete process.env.CHRYSALIS_HUB_GAP_REINGEST_STRICT;
    else process.env.CHRYSALIS_HUB_GAP_REINGEST_STRICT = prevStrict;
    if (prevReingest === undefined) delete process.env.CHRYSALIS_HUB_GAP_REINGEST;
    else process.env.CHRYSALIS_HUB_GAP_REINGEST = prevReingest;
    if (prevVerifyClosure === undefined) delete process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_CLOSURE;
    else process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_CLOSURE = prevVerifyClosure;
  }
}

async function main() {
  const report = runLaravelAuthProbeReingestVerifyClosureSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
