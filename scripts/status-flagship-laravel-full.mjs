#!/usr/bin/env node
/**
 * Milestone 4 (optional): compute `chrysalis status --json` migration metrics for
 * `flagship/chrysalis-laravel-work` after `verify:laravel-full`.
 *
 * Skips with exit 0 when scaffold/trace/report prerequisites are absent.
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");
const projectRel = "flagship/chrysalis-laravel-work";
const projectAbs = resolve(repo, projectRel);
const tracesRel = "traces/flagship-laravel-full";
const tracesAbs = resolve(repo, tracesRel);
const reportRel = "reports/verify-flagship-laravel-full";
const reportAbs = resolve(repo, reportRel);
const migrationOutRel = "reports/migration/flagship-laravel-full.json";
const migrationOutAbs = resolve(repo, migrationOutRel);
const cliBinAbs = resolve(repo, "packages/cli/dist/bin.js");
const routesAbs = resolve(projectAbs, "chrysalis.routes.json");

if (!existsSync(cliBinAbs)) {
  console.log(
    "[status-flagship-laravel-full] packages/cli/dist/bin.js missing (run `pnpm run build`) — skipping.",
  );
  process.exit(0);
}

if (!existsSync(projectAbs) || !existsSync(routesAbs) || !existsSync(tracesAbs) || !existsSync(reportAbs)) {
  console.log(
    "[status-flagship-laravel-full] scaffold project and/or traces/reports missing — skipping.",
  );
  process.exit(0);
}

const statusCmd =
  `node packages/cli/dist/bin.js status --json --project ${projectRel} --traces ${tracesRel} --report ${reportRel}`;

let statusJson = "";
try {
  statusJson = execSync(statusCmd, { cwd: repo, encoding: "utf8" });
} catch (e) {
  console.error("[status-flagship-laravel-full] status command failed.");
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
  console.error("[status-flagship-laravel-full] status-migration gate failed.");
  throw e;
}

mkdirSync(dirname(migrationOutAbs), { recursive: true });
writeFileSync(migrationOutAbs, statusJson);
console.log(`[status-flagship-laravel-full] wrote ${migrationOutRel}`);
