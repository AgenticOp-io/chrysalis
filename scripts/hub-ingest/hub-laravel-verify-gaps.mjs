#!/usr/bin/env node
/**
 * Laravel flagship verify divergences → prioritized ingest backlog (G104).
 */
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildVerifyGapsBacklog,
  loadFirstAvailableVerifyReport,
  loadVerifyReportsFromDir,
  resolveVerifySummaryPath,
  routeLabelFromTraceFile,
  loadPerRouteTraceFailures,
} from "./hub-verify-gaps-shared.mjs";

export const HUB_LARAVEL_VERIFY_GAPS_KIND = "chrysalis.hub.laravel-verify-gaps";
export const HUB_LARAVEL_VERIFY_GAPS_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const DEFAULT_REPORT_DIRS = [
  join(scriptRoot, "reports/verify-flagship-laravel-full"),
  join(scriptRoot, "reports/verify"),
  join(scriptRoot, "fixtures/ci/tiny-blog-verify-for-status"),
];

export { routeLabelFromTraceFile, loadPerRouteTraceFailures, loadVerifyReportsFromDir };

/** @deprecated use resolveVerifySummaryPath */
export function resolveFlagshipVerifySummaryPath(reportDir) {
  return resolveVerifySummaryPath(reportDir);
}

/**
 * @param {object} opts
 */
export function buildLaravelVerifyGapsReport(opts = {}) {
  const reportDirs = opts.reportDirs ?? DEFAULT_REPORT_DIRS;
  const loaded = loadFirstAvailableVerifyReport(reportDirs);
  const backlog = buildVerifyGapsBacklog(loaded?.failed ?? []);

  const templateRoutes = existsSync(join(scriptRoot, "flagship/laravel-full/chrysalis-templates/chrysalis.routes.json"))
    ? JSON.parse(
        readFileSync(join(scriptRoot, "flagship/laravel-full/chrysalis-templates/chrysalis.routes.json"), "utf8"),
      ).routes?.length ?? null
    : null;

  return {
    kind: HUB_LARAVEL_VERIFY_GAPS_KIND,
    schemaVersion: HUB_LARAVEL_VERIFY_GAPS_SCHEMA_VERSION,
    ok: loaded?.available === true,
    skipped: loaded ? null : "no-verify-report",
    verify: loaded
      ? {
          reportDir: loaded.reportDir,
          correctness: loaded.aggregate?.correctness ?? null,
          failedTraceRows: loaded.failed.length,
        }
      : null,
    flagship: {
      scaffold: "flagship/chrysalis-laravel-work",
      templateRouteCount: templateRoutes,
      verifyScript: "pnpm run verify:laravel-full",
    },
    backlog,
    generatedAt: new Date().toISOString(),
  };
}

function parseArgs(argv) {
  let jsonOut = null;
  let reportDir = null;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--json-out" && argv[i + 1]) jsonOut = resolve(argv[++i]);
    else if (argv[i] === "--report-dir" && argv[i + 1]) reportDir = resolve(argv[++i]);
  }
  return { jsonOut, reportDir };
}

async function main() {
  const { jsonOut, reportDir } = parseArgs(process.argv);
  const report = buildLaravelVerifyGapsReport({
    reportDirs: reportDir ? [reportDir] : DEFAULT_REPORT_DIRS,
  });
  if (jsonOut) {
    await mkdir(dirname(jsonOut), { recursive: true });
    await writeFile(jsonOut, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok && report.skipped) process.exit(0);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
