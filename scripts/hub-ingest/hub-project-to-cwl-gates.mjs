#!/usr/bin/env node
/**
 * Project-to-CWL oracle fixture gates (G179).
 * Exports migration.cwl on PHP flagships and asserts hole-free rich projection.
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import { exportProjectMigrationCwl } from "./hub-project-cwl-export.mjs";
import { loadWebir } from "./shared.mjs";
import { summarizeCwlProjection } from "./hub-webir-routes.mjs";

export const HUB_PROJECT_TO_CWL_GATES_KIND = "chrysalis.hub.project-to-cwl-gates";
export const HUB_PROJECT_TO_CWL_GATES_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const ORACLE_FIXTURES = [
  { id: "plainPhp", rel: "fixtures/hub-flagship-plain-php" },
  { id: "symfony", rel: "fixtures/hub-flagship-symfony" },
];

/**
 * @param {string} projectRel
 */
async function exportWithProjection(projectRel) {
  const projectDir = join(scriptRoot, projectRel);
  const meta = await exportProjectMigrationCwl(projectDir, { origin: "php" });
  let cwlProjection = null;
  if (meta.ok && meta.webirPath && existsSync(meta.webirPath)) {
    const webir = await loadWebir();
    const raw = JSON.parse(readFileSync(meta.webirPath, "utf8"));
    cwlProjection = summarizeCwlProjection(webir.moduleFromGoldenSnapshot(raw));
  }
  return {
    ok: meta.ok === true && meta.holeCount === 0,
    fixture: projectRel,
    routeCount: meta.routeCount ?? null,
    holeCount: meta.holeCount ?? null,
    exportSchemaVersion: meta.schemaVersion ?? null,
    cwlProjection,
  };
}

/**
 * @param {object} [opts]
 */
export async function runProjectToCwlOracleGates(opts = {}) {
  const fixtures = opts.fixtures ?? ORACLE_FIXTURES;
  /** @type {Record<string, Awaited<ReturnType<typeof exportWithProjection>>>} */
  const exports = {};
  let ok = true;
  for (const f of fixtures) {
    const block = await exportWithProjection(f.rel);
    exports[f.id] = block;
    if (!block.ok) ok = false;
  }
  return {
    kind: HUB_PROJECT_TO_CWL_GATES_KIND,
    schemaVersion: HUB_PROJECT_TO_CWL_GATES_SCHEMA_VERSION,
    ok,
    exports,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runProjectToCwlOracleGates();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
