#!/usr/bin/env node
/**
 * Project-to-CWL for every hub origin language (23/23) (G443).
 * Lifts each canonical probe fixture to WebIR and exports migration.cwl.
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { exportProjectMigrationCwl } from "./hub-project-cwl-export.mjs";
import { ensureProjectWebir } from "./hub-project-to-cwl-gates.mjs";
import { loadWebir } from "./shared.mjs";
import { summarizeCwlProjection } from "./hub-webir-routes.mjs";
import { CWL_ORIGIN_FIXTURES, resolveCwlOriginFixturePath, CWL_ORIGIN_FIXTURES_ROOT } from "./hub-cwl-origin-fixtures.mjs";

export const HUB_PROJECT_TO_CWL_ALL_ORIGINS_KIND = "chrysalis.hub.project-to-cwl-all-origins";
export const HUB_PROJECT_TO_CWL_ALL_ORIGINS_SCHEMA_VERSION = 1;

/**
 * @param {{ rel: string, origin: string, requireHoleFree?: boolean, minRoutes?: number }} fixture
 * @param {string} [rootDir]
 */
export async function exportOriginToCwl(fixture, rootDir = CWL_ORIGIN_FIXTURES_ROOT) {
  const projectDir = resolveCwlOriginFixturePath(fixture, rootDir);
  const webirReady = await ensureProjectWebir(projectDir, fixture.origin);
  if (!webirReady.ok) {
    return {
      ok: false,
      origin: fixture.origin,
      fixture: fixture.rel,
      skip: webirReady.skip ?? "webir-not-ready",
      routeCount: null,
      holeCount: null,
      cwlProjection: null,
    };
  }
  const exported = await exportProjectMigrationCwl(projectDir, { origin: fixture.origin });
  let cwlProjection = null;
  if (exported.ok && exported.webirPath) {
    const webir = await loadWebir();
    const raw = JSON.parse(readFileSync(exported.webirPath, "utf8"));
    cwlProjection = summarizeCwlProjection(webir.moduleFromGoldenSnapshot(raw));
  }
  const minRoutes = fixture.minRoutes ?? 1;
  const routeOk = (exported.routeCount ?? 0) >= minRoutes;
  const holeOk =
    fixture.requireHoleFree === true
      ? exported.holeCount === 0
      : exported.holeCount != null;
  return {
    ok: exported.ok === true && routeOk && holeOk,
    origin: fixture.origin,
    fixture: fixture.rel,
    routeCount: exported.routeCount ?? null,
    holeCount: exported.holeCount ?? null,
    cwlPath: exported.cwlPath ?? null,
    cwlProjection,
  };
}

/**
 * @param {object} [opts]
 */
export async function runProjectToCwlAllOrigins(opts = {}) {
  const fixtures = opts.fixtures ?? CWL_ORIGIN_FIXTURES;
  const rootDir = opts.rootDir ?? CWL_ORIGIN_FIXTURES_ROOT;
  /** @type {Record<string, Awaited<ReturnType<typeof exportOriginToCwl>>>} */
  const exports = {};
  let ok = true;
  for (const f of fixtures) {
    const block = await exportOriginToCwl(f, rootDir);
    exports[f.id] = block;
    if (!block.ok) ok = false;
  }
  return {
    kind: HUB_PROJECT_TO_CWL_ALL_ORIGINS_KIND,
    schemaVersion: HUB_PROJECT_TO_CWL_ALL_ORIGINS_SCHEMA_VERSION,
    ok,
    originCount: fixtures.length,
    exports,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runProjectToCwlAllOrigins();
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
