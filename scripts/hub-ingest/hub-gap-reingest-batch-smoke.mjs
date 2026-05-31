#!/usr/bin/env node
/** Gap reingest batch v3: v2 + optional verify closure after strict reingest (G893). */
import { copyFileSync, cpSync, existsSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { runVerifyGapsIngestAction } from "./hub-verify-gaps-ingest-action.mjs";

export const HUB_GAP_REINGEST_BATCH_KIND = "chrysalis.hub.gap-reingest-batch-smoke";
export const HUB_GAP_REINGEST_BATCH_SCHEMA_VERSION = 3;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const backlogSummary = join(scriptRoot, "fixtures/hub-laravel-verify-gaps-backlog/summary.json");
const authProbeFixture = join(scriptRoot, "fixtures/laravel-auth-probe");
const cliBin = join(scriptRoot, "packages/cli/dist/bin.js");

function withBacklogProject(fn) {
  const tmp = mkdtempSync(join(tmpdir(), "chrysalis-gap-reingest-"));
  try {
    cpSync(authProbeFixture, tmp, { recursive: true });
    mkdirSync(join(tmp, "reports", "verify"), { recursive: true });
    copyFileSync(backlogSummary, join(tmp, "reports", "verify/summary.json"));
    return fn(tmp);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

export function runGapReingestBatchSmoke() {
  const remediation = withBacklogProject((projectDir) =>
    runVerifyGapsIngestAction(projectDir, { reingest: false }),
  );
  const remediationOk =
    remediation.ok === true &&
    remediation.ingestRemediation != null &&
    remediation.verifyGaps?.backlogCount > 0;

  let reingest = { ok: true, skip: "reingest-not-requested", ran: false };
  let verifyClosure = { ok: true, skip: "verify-closure-not-requested", applied: false, backlogAfter: null, correctnessAfter: null };
  if (process.env.CHRYSALIS_HUB_GAP_REINGEST === "1") {
    if (!existsSync(cliBin)) {
      reingest = { ok: true, skip: "no-cli-bin", ran: false };
    } else {
      const prevVerifyClosure = process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_CLOSURE;
      if (process.env.CHRYSALIS_HUB_GAP_REINGEST_STRICT === "1") {
        process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_CLOSURE = "1";
      }
      try {
        const action = withBacklogProject((projectDir) =>
          runVerifyGapsIngestAction(projectDir, { reingest: true, cliBin }),
        );
        reingest = {
          ok: action.ok === true,
          skip: null,
          ran: action.reingest?.ran === true,
          exitCode: action.reingest?.exitCode ?? null,
        };
        if (action.verifyClosure?.applied === true) {
          verifyClosure = {
            ok:
              action.verifyClosure.ok === true &&
              (action.verifyGapsAfter?.backlogCount ?? 1) === 0 &&
              (action.verifyGapsAfter?.correctness ?? 0) >= 1,
            skip: null,
            applied: true,
            backlogAfter: action.verifyGapsAfter?.backlogCount ?? null,
            correctnessAfter: action.verifyGapsAfter?.correctness ?? null,
          };
        }
      } finally {
        if (prevVerifyClosure === undefined) delete process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_CLOSURE;
        else process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_CLOSURE = prevVerifyClosure;
      }
    }
  }

  return {
    kind: HUB_GAP_REINGEST_BATCH_KIND,
    schemaVersion: HUB_GAP_REINGEST_BATCH_SCHEMA_VERSION,
    ok: remediationOk && reingest.ok === true && verifyClosure.ok === true,
    fixture: "fixtures/laravel-auth-probe",
    backlogFixture: "fixtures/hub-laravel-verify-gaps-backlog",
    remediation: {
      ok: remediationOk,
      divergenceKind: remediation.ingestRemediation?.divergenceKind ?? null,
      backlogCount: remediation.verifyGaps?.backlogCount ?? null,
    },
    reingest,
    verifyClosure,
    requireVerifyClosureEnv: "CHRYSALIS_HUB_GAP_REINGEST_VERIFY_CLOSURE",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = runGapReingestBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
