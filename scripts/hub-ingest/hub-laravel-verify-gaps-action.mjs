#!/usr/bin/env node
/**
 * Laravel verify gaps → global ingest remediation action (G163).
 * Surfaces repo-level ingestNext from merged flagship verify reports.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildLaravelVerifyGapsReport,
  HUB_LARAVEL_VERIFY_GAPS_KIND,
} from "./hub-laravel-verify-gaps.mjs";

export const HUB_LARAVEL_VERIFY_GAPS_ACTION_KIND = "chrysalis.hub.laravel-verify-gaps-action";
export const HUB_LARAVEL_VERIFY_GAPS_ACTION_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * @param {{ reportDirs?: string[], jsonOut?: string }} [opts]
 */
export function runLaravelVerifyGapsAction(opts = {}) {
  const gaps = buildLaravelVerifyGapsReport({
    reportDirs: opts.reportDirs,
    merge: opts.reportDirs ? false : true,
  });

  return {
    kind: HUB_LARAVEL_VERIFY_GAPS_ACTION_KIND,
    schemaVersion: HUB_LARAVEL_VERIFY_GAPS_ACTION_SCHEMA_VERSION,
    ok: gaps.ok,
    laravelVerifyGaps: {
      kind: HUB_LARAVEL_VERIFY_GAPS_KIND,
      available: gaps.ok,
      backlogCount: gaps.backlog.length,
      ingestNext: gaps.ingestNext,
      verifyScript: gaps.flagship?.verifyScript ?? "pnpm run verify:laravel-full",
      exportScript: "pnpm run hub:laravel-verify-gaps",
    },
    ingestRemediation: gaps.ingestNext
      ? {
          owner: gaps.ingestNext.ingestOwner ?? "packages/ingest",
          divergenceKind: gaps.ingestNext.divergenceKind,
          playbook: gaps.ingestNext.playbook,
          suggestedCommand: "pnpm run verify:laravel-full && pnpm run hub:laravel-verify-gaps",
        }
      : null,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * @param {string} jsonOut
 * @param {ReturnType<typeof runLaravelVerifyGapsAction>} [report]
 */
export async function writeLaravelVerifyGapsActionArtifacts(jsonOut, report) {
  const payload = report ?? runLaravelVerifyGapsAction();
  await mkdir(dirname(jsonOut), { recursive: true });
  await writeFile(jsonOut, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return { jsonPath: jsonOut, report: payload };
}

function parseArgs(argv) {
  let jsonOut = join(scriptRoot, "reports/ci/hub-laravel-verify-gaps-action.json");
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--json-out" && argv[i + 1]) jsonOut = resolve(argv[++i]);
  }
  return { jsonOut };
}

async function main() {
  const { jsonOut } = parseArgs(process.argv);
  const { report, jsonPath } = await writeLaravelVerifyGapsActionArtifacts(jsonOut);
  console.log(JSON.stringify({ ...report, artifactPath: jsonPath }, null, 2));
  if (!report.ok && report.laravelVerifyGaps?.available === false) process.exit(0);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
