#!/usr/bin/env node
/** Migration OS smokes: contract, planner, programs (G231-G233). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildMigrationContractReport } from "./hub-migration-contract.mjs";
import { buildMigrationPlan } from "./hub-migration-planner.mjs";
import { buildMigrationProgram, MIGRATION_PROGRAM_TEMPLATES } from "./hub-migration-programs.mjs";
import { exportPhpHubWebir } from "./hub-php-hub-webir.mjs";

export const HUB_MIGRATION_OS_SMOKE_KIND = "chrysalis.hub.migration-os-smoke";
export const HUB_MIGRATION_OS_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const defaultFixture = join(scriptRoot, "fixtures/hub-flagship-plain-php");

export async function runMigrationContractSmoke(projectDir = defaultFixture) {
  const root = resolve(projectDir);
  await exportPhpHubWebir(root);
  const report = await buildMigrationContractReport(root, { origin: "php", write: true });
  return {
    ok: report.ok === true,
    schemaVersion: report.schemaVersion,
    holeCount: report.holes?.count ?? null,
    hasOpenapi: report.artifacts?.openapi != null,
    hasCwlDiff: report.cwlDiff != null,
  };
}

export function runMigrationPlannerSmoke() {
  const plan = buildMigrationPlan({ origin: "php", outputs: ["hono", "fastify"] });
  return {
    ok:
      plan.kind === "chrysalis.hub.migration-plan" &&
      plan.steps.length >= 5 &&
      plan.recommendedOutput === "hono",
    stepCount: plan.steps.length,
    recommendedOutput: plan.recommendedOutput ?? null,
  };
}

export function runMigrationProgramsSmoke() {
  const program = buildMigrationProgram({
    origin: "php",
    outputs: ["hono"],
    programId: "api-slice",
  });
  return {
    ok:
      program.kind === "chrysalis.hub.migration-programs" &&
      program.program?.id === "api-slice" &&
      Object.keys(MIGRATION_PROGRAM_TEMPLATES).length >= 3,
    templateCount: Object.keys(MIGRATION_PROGRAM_TEMPLATES).length,
    programId: program.program?.id ?? null,
  };
}

export async function runMigrationOsSmoke(projectDir = defaultFixture) {
  const contract = await runMigrationContractSmoke(projectDir);
  const planner = runMigrationPlannerSmoke();
  const programs = runMigrationProgramsSmoke();
  const ok = contract.ok && planner.ok && programs.ok;
  return {
    kind: HUB_MIGRATION_OS_SMOKE_KIND,
    schemaVersion: HUB_MIGRATION_OS_SMOKE_SCHEMA_VERSION,
    ok,
    contract,
    planner,
    programs,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runMigrationOsSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
