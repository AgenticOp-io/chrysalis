#!/usr/bin/env node
/** IR helper semantic lifting smoke — gap-probe, param-twin, sql twins (B3–B5.3 v3). */
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const HUB_IR_HELPER_LIFTING_SEMANTIC_KIND = "chrysalis.hub.ir-helper-lifting-semantic-smoke";
export const HUB_IR_HELPER_LIFTING_SEMANTIC_SCHEMA_VERSION = 5;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliBin = join(scriptRoot, "packages/cli/dist/bin.js");

const SEMANTIC_LIFT_FLAGS = [
  "--ingest-lift-shared-helpers",
  "--ingest-lift-shared-helpers-semantic",
  "--ingest-dedupe-structural-subgraphs",
];

function fixtureRel(absPath) {
  const root = scriptRoot.endsWith("\\") || scriptRoot.endsWith("/") ? scriptRoot : scriptRoot + "/";
  const normalized = absPath.replace(/\\/g, "/");
  const rootNorm = root.replace(/\\/g, "/");
  if (normalized.startsWith(rootNorm)) {
    return normalized.slice(rootNorm.length);
  }
  return normalized;
}

const FIXTURES = [
  { id: "gap-probe", path: join(scriptRoot, "fixtures/lift-helper-gap-probe") },
  { id: "param-twin", path: join(scriptRoot, "fixtures/lift-helper-param-twin") },
  { id: "sql-twin", path: join(scriptRoot, "fixtures/lift-helper-sql-twin") },
  { id: "sql-ws-twin", path: join(scriptRoot, "fixtures/lift-helper-sql-ws-twin") },
  { id: "sql-same-twin", path: join(scriptRoot, "fixtures/lift-helper-sql-same-twin") },
  { id: "sql-case-twin", path: join(scriptRoot, "fixtures/lift-helper-sql-case-twin") },
  { id: "sql-param-inline", path: join(scriptRoot, "fixtures/lift-helper-sql-param-inline") },
];

function ingestFixture(fixturePath) {
  const r = spawnSync(process.execPath, [cliBin, "ingest", fixturePath, ...SEMANTIC_LIFT_FLAGS], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  const holesMatch = (r.stdout ?? "").match(/^holes:\s+(\d+)/m);
  const holesAfter = holesMatch ? Number(holesMatch[1]) : null;
  return {
    ok: (r.status ?? 1) === 0 && holesAfter === 0,
    exitCode: r.status ?? 1,
    holesAfter,
  };
}

export function runIrHelperLiftingSemanticSmoke() {
  if (!existsSync(cliBin)) {
    return {
      kind: HUB_IR_HELPER_LIFTING_SEMANTIC_KIND,
      schemaVersion: HUB_IR_HELPER_LIFTING_SEMANTIC_SCHEMA_VERSION,
      ok: false,
      skip: "no-cli-bin",
      fixture: "fixtures/lift-helper-gap-probe",
      fixtures: FIXTURES.map((f) => ({ id: f.id, fixture: fixtureRel(f.path), ok: false, skip: "no-cli-bin" })),
      generatedAt: new Date().toISOString(),
    };
  }
  const results = FIXTURES.map((f) => {
    const run = ingestFixture(f.path);
    return {
      id: f.id,
      fixture: fixtureRel(f.path),
      ...run,
    };
  });
  const ok = results.every((r) => r.ok);
  return {
    kind: HUB_IR_HELPER_LIFTING_SEMANTIC_KIND,
    schemaVersion: HUB_IR_HELPER_LIFTING_SEMANTIC_SCHEMA_VERSION,
    ok,
    fixture: "fixtures/lift-helper-gap-probe",
    fixtures: results,
    exitCode: ok ? 0 : (results.find((r) => !r.ok)?.exitCode ?? 1),
    holesAfter: results.find((r) => r.id === "gap-probe")?.holesAfter ?? null,
    flags: ["--ingest-lift-shared-helpers", "--ingest-lift-shared-helpers-semantic"],
    generatedAt: new Date().toISOString(),
  };
}

function main() {
  const report = runIrHelperLiftingSemanticSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
