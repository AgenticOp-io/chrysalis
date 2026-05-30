#!/usr/bin/env node
/**
 * Per-project verify divergences → ingest backlog (G147).
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildVerifyGapsBacklog,
  loadFirstAvailableVerifyReport,
} from "./hub-verify-gaps-shared.mjs";

export const HUB_VERIFY_GAPS_INGEST_KIND = "chrysalis.hub.verify-gaps-ingest";
export const HUB_VERIFY_GAPS_INGEST_SCHEMA_VERSION = 1;

/**
 * @param {string} projectDir
 * @param {{ reportDirs?: string[] }} [opts]
 */
export function buildProjectVerifyGapsIngestReport(projectDir, opts = {}) {
  const root = resolve(projectDir);
  const defaultDirs = [
    join(root, "reports", "verify"),
    join(root, "reports", "verify-flagship-laravel-full"),
  ];
  const reportDirs = opts.reportDirs ?? defaultDirs;
  const loaded = loadFirstAvailableVerifyReport(reportDirs);
  const backlog = buildVerifyGapsBacklog(loaded?.failed ?? []);

  return {
    kind: HUB_VERIFY_GAPS_INGEST_KIND,
    schemaVersion: HUB_VERIFY_GAPS_INGEST_SCHEMA_VERSION,
    projectDir: root,
    ok: loaded?.available === true,
    skipped: loaded ? null : "no-verify-report",
    verify: loaded
      ? {
          reportDir: loaded.reportDir,
          summaryPath: loaded.summaryPath,
          source: loaded.source,
          correctness: loaded.aggregate?.correctness ?? null,
          failedTraceRows: loaded.failed.length,
        }
      : null,
    backlog,
    ingestNext: backlog.length > 0 ? backlog[0] : null,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * @param {string} projectDir
 * @param {ReturnType<typeof buildProjectVerifyGapsIngestReport>} [report]
 */
export async function writeProjectVerifyGapsArtifacts(projectDir, report) {
  const root = resolve(projectDir);
  const payload = report ?? buildProjectVerifyGapsIngestReport(root);
  const outDir = join(root, ".chrysalis");
  await mkdir(outDir, { recursive: true });
  const jsonPath = join(outDir, "verify-gaps-ingest.json");
  await writeFile(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return { jsonPath, report: payload };
}

function parseArgs(argv) {
  let projectDir = null;
  let jsonOut = null;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--project" && argv[i + 1]) projectDir = resolve(argv[++i]);
    else if (argv[i] === "--json-out" && argv[i + 1]) jsonOut = resolve(argv[++i]);
  }
  if (!projectDir) {
    throw new Error("usage: hub-verify-gaps-ingest.mjs --project <dir> [--json-out path]");
  }
  return { projectDir, jsonOut };
}

async function main() {
  const { projectDir, jsonOut } = parseArgs(process.argv);
  const { report, jsonPath } = await writeProjectVerifyGapsArtifacts(projectDir);
  if (jsonOut) {
    await mkdir(dirname(jsonOut), { recursive: true });
    await writeFile(jsonOut, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify({ ...report, writtenPath: jsonPath }, null, 2));
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
