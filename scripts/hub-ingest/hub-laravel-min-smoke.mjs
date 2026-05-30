#!/usr/bin/env node
/**
 * Laravel-min scaffold hub smoke (G167): route manifest + global verify-gaps linkage.
 */
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildLaravelVerifyGapsReport } from "./hub-laravel-verify-gaps.mjs";

export const HUB_LARAVEL_MIN_SMOKE_KIND = "chrysalis.hub.laravel-min-smoke";
export const HUB_LARAVEL_MIN_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const LARAVEL_MIN = join(scriptRoot, "flagship/laravel-min");
const MIN_ROUTE_COUNT = 15;

function countRoutes(fixtureDir) {
  const routesPath = join(fixtureDir, "chrysalis.routes.json");
  if (!existsSync(routesPath)) return 0;
  try {
    const j = JSON.parse(readFileSync(routesPath, "utf8"));
    return Array.isArray(j.routes) ? j.routes.length : 0;
  } catch {
    return 0;
  }
}

/**
 * @param {{ reportDirs?: string[] }} [opts]
 */
export function buildHubLaravelMinSmokeReport(opts = {}) {
  const routeCount = countRoutes(LARAVEL_MIN);
  const gaps = buildLaravelVerifyGapsReport({ reportDirs: opts.reportDirs });

  return {
    kind: HUB_LARAVEL_MIN_SMOKE_KIND,
    schemaVersion: HUB_LARAVEL_MIN_SMOKE_SCHEMA_VERSION,
    ok: routeCount >= MIN_ROUTE_COUNT && gaps.ok === true,
    scaffold: "flagship/laravel-min",
    routeCount,
    minRouteCount: MIN_ROUTE_COUNT,
    laravelVerifyGaps: {
      ok: gaps.ok,
      backlogCount: gaps.backlog?.length ?? 0,
      ingestNext: gaps.ingestNext?.divergenceKind ?? null,
    },
    script: "pnpm run hub:laravel-min-smoke",
    generatedAt: new Date().toISOString(),
  };
}

function parseArgs(argv) {
  let jsonOut = null;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--json-out" && argv[i + 1]) jsonOut = resolve(argv[++i]);
  }
  return { jsonOut };
}

async function main() {
  const { jsonOut } = parseArgs(process.argv);
  const report = buildHubLaravelMinSmokeReport();
  if (jsonOut) {
    await mkdir(dirname(jsonOut), { recursive: true });
    await writeFile(jsonOut, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
