#!/usr/bin/env node
/** Gap reingest batch: remediation probe + optional CHRYSALIS_HUB_GAP_REINGEST (G805). */
import { copyFileSync, existsSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { runVerifyGapsIngestAction } from "./hub-verify-gaps-ingest-action.mjs";

export const HUB_GAP_REINGEST_BATCH_KIND = "chrysalis.hub.gap-reingest-batch-smoke";
export const HUB_GAP_REINGEST_BATCH_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const backlogSummary = join(scriptRoot, "fixtures/hub-laravel-verify-gaps-backlog/summary.json");
const cliBin = join(scriptRoot, "packages/cli/dist/bin.js");

function withBacklogProject(fn) {
  const tmp = mkdtempSync(join(tmpdir(), "chrysalis-gap-reingest-"));
  try {
    mkdirSync(join(tmp, "reports", "verify"), { recursive: true });
    copyFileSync(backlogSummary, join(tmp, "reports", "verify/summary.json"));
    copyFileSync(
      join(scriptRoot, "fixtures/hub-flagship-plain-php/chrysalis.routes.json"),
      join(tmp, "chrysalis.routes.json"),
    );
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
  if (process.env.CHRYSALIS_HUB_GAP_REINGEST === "1") {
    if (!existsSync(cliBin)) {
      reingest = { ok: true, skip: "no-cli-bin", ran: false };
    } else {
      const action = withBacklogProject((projectDir) =>
        runVerifyGapsIngestAction(projectDir, { reingest: true, cliBin }),
      );
      reingest = {
        ok: action.ok === true,
        skip: null,
        ran: action.reingest?.ran === true,
        exitCode: action.reingest?.exitCode ?? null,
      };
    }
  }

  return {
    kind: HUB_GAP_REINGEST_BATCH_KIND,
    schemaVersion: HUB_GAP_REINGEST_BATCH_SCHEMA_VERSION,
    ok: remediationOk && reingest.ok === true,
    remediation: {
      ok: remediationOk,
      divergenceKind: remediation.ingestRemediation?.divergenceKind ?? null,
      backlogCount: remediation.verifyGaps?.backlogCount ?? null,
    },
    reingest,
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
