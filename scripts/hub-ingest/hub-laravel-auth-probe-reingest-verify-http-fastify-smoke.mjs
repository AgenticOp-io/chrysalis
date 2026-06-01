#!/usr/bin/env node
/** Strict reingest + Fastify HTTP oracle verify → backlog 0 (G1011). */
import { copyFileSync, cpSync, existsSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { buildProjectVerifyGapsIngestReport } from "./hub-verify-gaps-ingest.mjs";
import { runVerifyGapsIngestAction } from "./hub-verify-gaps-ingest-action.mjs";

export const HUB_LARAVEL_AUTH_PROBE_REINGEST_VERIFY_HTTP_FASTIFY_KIND =
  "chrysalis.hub.laravel-auth-probe-reingest-verify-http-fastify-smoke";
export const HUB_LARAVEL_AUTH_PROBE_REINGEST_VERIFY_HTTP_FASTIFY_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const backlogSummary = join(scriptRoot, "fixtures/hub-laravel-verify-gaps-backlog/summary.json");
const authProbeFixture = join(scriptRoot, "fixtures/laravel-auth-probe");
const cliBin = join(scriptRoot, "packages/cli/dist/bin.js");

function prepareBacklogProject() {
  const tmp = mkdtempSync(join(tmpdir(), "chrysalis-auth-probe-http-fastify-"));
  cpSync(authProbeFixture, tmp, { recursive: true });
  mkdirSync(join(tmp, "reports", "verify"), { recursive: true });
  copyFileSync(backlogSummary, join(tmp, "reports", "verify/summary.json"));
  return tmp;
}

export async function runLaravelAuthProbeReingestVerifyHttpFastifySmoke() {
  const prevStrict = process.env.CHRYSALIS_HUB_GAP_REINGEST_STRICT;
  const prevReingest = process.env.CHRYSALIS_HUB_GAP_REINGEST;
  const prevVerifyHttp = process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_HTTP;
  const prevVerifyHttpTarget = process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_HTTP_TARGET;
  const prevVerifyReplay = process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_REPLAY;
  const prevVerifyClosure = process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_CLOSURE;
  process.env.CHRYSALIS_HUB_GAP_REINGEST_STRICT = "1";
  process.env.CHRYSALIS_HUB_GAP_REINGEST = "1";
  process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_HTTP = "1";
  process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_HTTP_TARGET = "fastify";
  delete process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_REPLAY;
  delete process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_CLOSURE;
  try {
    if (!existsSync(cliBin)) {
      return {
        kind: HUB_LARAVEL_AUTH_PROBE_REINGEST_VERIFY_HTTP_FASTIFY_KIND,
        schemaVersion: HUB_LARAVEL_AUTH_PROBE_REINGEST_VERIFY_HTTP_FASTIFY_SCHEMA_VERSION,
        ok: false,
        skip: "no-cli-bin",
        cliAvailable: false,
        target: "fastify",
        generatedAt: new Date().toISOString(),
      };
    }

    const tmp = prepareBacklogProject();
    let result;
    try {
      const before = buildProjectVerifyGapsIngestReport(tmp);
      const action = await runVerifyGapsIngestAction(tmp, { reingest: true, cliBin });
      const after = buildProjectVerifyGapsIngestReport(tmp);
      result = { before, action, after };
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }

    const reingestOk =
      result.action.reingest?.ran === true &&
      result.action.reingest?.exitCode === 0 &&
      result.action.ok === true;
    const verifyHttpOk =
      result.action.verifyHttp?.applied === true &&
      result.action.verifyHttp?.ok === true &&
      result.after.backlog.length === 0 &&
      (result.after.verify?.correctness ?? 0) >= 1;

    return {
      kind: HUB_LARAVEL_AUTH_PROBE_REINGEST_VERIFY_HTTP_FASTIFY_KIND,
      schemaVersion: HUB_LARAVEL_AUTH_PROBE_REINGEST_VERIFY_HTTP_FASTIFY_SCHEMA_VERSION,
      ok: reingestOk && verifyHttpOk,
      cliAvailable: true,
      target: "fastify",
      fixture: "fixtures/laravel-auth-probe",
      backlogBefore: result.before.backlog.length,
      backlogAfter: result.after.backlog.length,
      correctnessAfter: result.after.verify?.correctness ?? null,
      reingest: {
        ran: result.action.reingest?.ran === true,
        exitCode: result.action.reingest?.exitCode ?? null,
        verifyHttpApplied: result.action.verifyHttp?.applied === true,
      },
      verifyHttp: result.action.verifyHttp ?? null,
      requireVerifyHttpEnv: "CHRYSALIS_HUB_GAP_REINGEST_VERIFY_HTTP",
      requireVerifyHttpTargetEnv: "CHRYSALIS_HUB_GAP_REINGEST_VERIFY_HTTP_TARGET",
      generatedAt: new Date().toISOString(),
    };
  } finally {
    if (prevStrict === undefined) delete process.env.CHRYSALIS_HUB_GAP_REINGEST_STRICT;
    else process.env.CHRYSALIS_HUB_GAP_REINGEST_STRICT = prevStrict;
    if (prevReingest === undefined) delete process.env.CHRYSALIS_HUB_GAP_REINGEST;
    else process.env.CHRYSALIS_HUB_GAP_REINGEST = prevReingest;
    if (prevVerifyHttp === undefined) delete process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_HTTP;
    else process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_HTTP = prevVerifyHttp;
    if (prevVerifyHttpTarget === undefined) delete process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_HTTP_TARGET;
    else process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_HTTP_TARGET = prevVerifyHttpTarget;
    if (prevVerifyReplay === undefined) delete process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_REPLAY;
    else process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_REPLAY = prevVerifyReplay;
    if (prevVerifyClosure === undefined) delete process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_CLOSURE;
    else process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_CLOSURE = prevVerifyClosure;
  }
}

async function main() {
  const report = await runLaravelAuthProbeReingestVerifyHttpFastifySmoke();
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
