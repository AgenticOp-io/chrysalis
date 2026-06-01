#!/usr/bin/env node
/**
 * Flagship CWL migration contract + hole-budget sidecar smoke (G1162).
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkFullstackHoleBudget, readFullstackHoleBudget } from "./hub-cwl-fullstack-hole-budget.mjs";
import { exportProjectMigrationCwl } from "./hub-project-cwl-export.mjs";
import { parseCwlModule } from "./cwl-parser.mjs";

export const HUB_CWL_FLAGSHIP_MIGRATION_EXPORT_KIND = "chrysalis.hub.cwl-flagship-migration-export";
export const HUB_CWL_FLAGSHIP_MIGRATION_EXPORT_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");
const goldFixture = join(scriptRoot, "fixtures/hub-flagship-cwl-fullstack");

/**
 * @param {object} [opts]
 */
export async function runCwlFlagshipMigrationExportSmoke(opts = {}) {
  const fixture = resolve(opts.fixture ?? goldFixture);
  const base = {
    kind: HUB_CWL_FLAGSHIP_MIGRATION_EXPORT_KIND,
    schemaVersion: HUB_CWL_FLAGSHIP_MIGRATION_EXPORT_SCHEMA_VERSION,
    fixture: "fixtures/hub-flagship-cwl-fullstack",
    ok: false,
  };

  const budgetRead = await readFullstackHoleBudget(fixture);
  if (!budgetRead.ok) {
    return { ...base, skip: budgetRead.reason };
  }

  const lift = spawnSync(process.execPath, [liftScript, fixture, "--language", "cwl"], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (lift.status !== 0) {
    return { ...base, skip: "lift-failed", detail: (lift.stderr || lift.stdout)?.slice(0, 400) };
  }

  const exported = await exportProjectMigrationCwl(fixture, { origin: "cwl" });
  if (!exported.ok) {
    return { ...base, skip: exported.reason ?? "export-failed" };
  }

  const metaPath = join(fixture, ".chrysalis", "cwl-export.json");
  const meta = JSON.parse(await readFile(metaPath, "utf8"));
  const migrationSrc = await readFile(exported.cwlPath, "utf8");
  const parsed = parseCwlModule(migrationSrc, "migration.cwl");
  const pageCount = parsed.routes.filter((r) => r.surfaceKind === "page").length;
  const apiCount = parsed.routes.filter((r) => (r.surfaceKind ?? "api") === "api").length;
  const budgetCheck = checkFullstackHoleBudget(budgetRead.budget, {
    holeCount: exported.holeCount ?? 0,
    routeCount: exported.routeCount ?? 0,
    pageCount,
    apiCount,
  });

  const ok =
    budgetCheck.ok &&
    existsSync(exported.cwlPath) &&
    meta.fullstackHoleBudget?.kind === budgetRead.budget.kind &&
    (exported.holeCount ?? 0) <= budgetRead.budget.maxHoles;

  return {
    ...base,
    ok,
    budgetCheck,
    exported,
    metaHasBudget: Boolean(meta.fullstackHoleBudget),
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlFlagshipMigrationExportSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok && !report.skip) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
