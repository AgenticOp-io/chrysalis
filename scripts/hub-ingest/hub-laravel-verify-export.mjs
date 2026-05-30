#!/usr/bin/env node
/**
 * Export live flagship Laravel verify summary for hub verify-gaps merge (G173).
 */
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveVerifySummaryPath } from "./hub-verify-gaps-shared.mjs";

export const HUB_LARAVEL_VERIFY_EXPORT_KIND = "chrysalis.hub.laravel-verify-export";
export const HUB_LARAVEL_VERIFY_EXPORT_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * @param {{ reportDir?: string, jsonOut?: string }} [opts]
 */
export function exportHubLaravelVerifyLive(opts = {}) {
  const reportDir = resolve(opts.reportDir ?? join(scriptRoot, "reports/verify-flagship-laravel-full/hono"));
  const summaryPath = resolveVerifySummaryPath(reportDir) ?? join(reportDir, "summary.json");
  if (!existsSync(summaryPath)) {
    return {
      kind: HUB_LARAVEL_VERIFY_EXPORT_KIND,
      schemaVersion: HUB_LARAVEL_VERIFY_EXPORT_SCHEMA_VERSION,
      ok: false,
      error: "missing-summary",
      reportDir,
      summaryPath,
    };
  }
  const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
  let failedEndpoints = 0;
  for (const ep of summary.endpoints ?? []) {
    if ((ep.divergences ?? []).length > 0) failedEndpoints += 1;
  }
  return {
    kind: HUB_LARAVEL_VERIFY_EXPORT_KIND,
    schemaVersion: HUB_LARAVEL_VERIFY_EXPORT_SCHEMA_VERSION,
    ok: true,
    reportDir,
    summaryPath,
    aggregate: summary.aggregate ?? null,
    endpointCount: summary.endpoints?.length ?? 0,
    failedEndpoints,
    exportScript: "pnpm run hub:laravel-verify-export",
    generatedAt: new Date().toISOString(),
  };
}

/**
 * @param {{ reportDir?: string, jsonOut?: string }} [opts]
 */
export async function writeHubLaravelVerifyLiveArtifact(opts = {}) {
  const jsonOut = resolve(opts.jsonOut ?? join(scriptRoot, "reports/ci/hub-laravel-verify-live.json"));
  const report = exportHubLaravelVerifyLive(opts);
  await mkdir(dirname(jsonOut), { recursive: true });
  await writeFile(jsonOut, `${JSON.stringify({ ...report, artifactPath: jsonOut }, null, 2)}\n`, "utf8");
  return { jsonPath: jsonOut, report };
}

function parseArgs(argv) {
  let reportDir = null;
  let jsonOut = null;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--report-dir" && argv[i + 1]) reportDir = resolve(argv[++i]);
    else if (argv[i] === "--json-out" && argv[i + 1]) jsonOut = resolve(argv[++i]);
  }
  return { reportDir, jsonOut };
}

async function main() {
  const { reportDir, jsonOut } = parseArgs(process.argv);
  const { report, jsonPath } = await writeHubLaravelVerifyLiveArtifact({ reportDir: reportDir ?? undefined, jsonOut: jsonOut ?? undefined });
  console.log(JSON.stringify({ ...report, artifactPath: jsonPath }, null, 2));
  process.exit(report.ok ? 0 : 1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
