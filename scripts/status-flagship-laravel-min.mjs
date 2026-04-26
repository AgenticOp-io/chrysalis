#!/usr/bin/env node
/**
 * Milestone 4: compute `chrysalis status --json` migration metrics for
 * `flagship/laravel-min` after `verify:flagship` / `verify-flagship-laravel-min.mjs`.
 *
 * Skips with exit 0 when traces/reports prerequisites are absent.
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { writeFlagshipLaravelMinMigrationSidecars } from "./flagship-migration-metrics.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");
const projectRel = "flagship/laravel-min";
const projectAbs = resolve(repo, projectRel);
const tracesRel = "traces/flagship-laravel-min";
const tracesAbs = resolve(repo, tracesRel);
const reportRel = "reports/verify-flagship-laravel-min";
const reportAbs = resolve(repo, reportRel);
const migrationOutRel = "reports/migration/flagship-laravel-min.json";
const migrationOutAbs = resolve(repo, migrationOutRel);
const cliBinAbs = resolve(repo, "packages/cli/dist/bin.js");
const routesAbs = resolve(projectAbs, "chrysalis.routes.json");

if (!existsSync(cliBinAbs)) {
  console.log(
    "[status-flagship-laravel-min] packages/cli/dist/bin.js missing (run `pnpm run build`) — skipping.",
  );
  process.exit(0);
}

if (!existsSync(projectAbs) || !existsSync(routesAbs) || !existsSync(tracesAbs) || !existsSync(reportAbs)) {
  console.log(
    "[status-flagship-laravel-min] project and/or traces/reports missing — skipping.",
  );
  process.exit(0);
}

const statusCmd =
  `node packages/cli/dist/bin.js status --json --project ${projectRel} --traces ${tracesRel} --report ${reportRel}`;

let statusJson = "";
try {
  statusJson = execSync(statusCmd, { cwd: repo, encoding: "utf8" });
} catch (e) {
  console.error("[status-flagship-laravel-min] status command failed.");
  throw e;
}

try {
  execSync("node scripts/ci-gates.mjs status-migration", {
    cwd: repo,
    input: statusJson,
    stdio: ["pipe", "inherit", "inherit"],
    env: process.env,
  });
} catch (e) {
  console.error("[status-flagship-laravel-min] status-migration gate failed.");
  throw e;
}

mkdirSync(dirname(migrationOutAbs), { recursive: true });
writeFileSync(migrationOutAbs, statusJson);
console.log(`[status-flagship-laravel-min] wrote ${migrationOutRel}`);

writeFlagshipLaravelMinMigrationSidecars(repo);
