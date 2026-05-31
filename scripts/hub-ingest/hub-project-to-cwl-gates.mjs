#!/usr/bin/env node
/**
 * Project-to-CWL oracle fixture gates (G179/G183).
 * Exports migration.cwl on PHP flagships + Express JS origin.
 */
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import { exportProjectMigrationCwl } from "./hub-project-cwl-export.mjs";
import { exportPhpHubWebir } from "./hub-php-hub-webir.mjs";
import { loadWebir } from "./shared.mjs";
import { summarizeCwlProjection } from "./hub-webir-routes.mjs";

export const HUB_PROJECT_TO_CWL_GATES_KIND = "chrysalis.hub.project-to-cwl-gates";
export const HUB_PROJECT_TO_CWL_GATES_SCHEMA_VERSION = 3;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");

/** @type {const} */
const ORACLE_FIXTURES = [
  { id: "plainPhp", rel: "fixtures/hub-flagship-plain-php", origin: "php", requireHoleFree: true },
  { id: "symfony", rel: "fixtures/hub-flagship-symfony", origin: "php", requireHoleFree: true },
  { id: "express", rel: "fixtures/hub-flagship-express", origin: "javascript", requireHoleFree: true },
  { id: "laravelMin", rel: "flagship/laravel-min", origin: "php", requireHoleFree: false, minHoleFree: 1 },
  { id: "tinyBlog", rel: "fixtures/tiny-blog", origin: "php", requireHoleFree: false },
];

export async function ensureProjectWebir(projectDir, origin) {
  const hubWebir = join(projectDir, ".chrysalis", `hub.${origin}.webir.json`);
  if (existsSync(hubWebir)) return { ok: true };
  if (origin === "php") {
    return exportPhpHubWebir(projectDir);
  }
  const r = spawnSync(process.execPath, [liftScript, projectDir, "--language", origin], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  let report = {};
  try {
    const lines = (r.stdout ?? "").trim().split("\n");
    report = JSON.parse(lines[lines.length - 1] ?? "{}");
  } catch {
    report = {};
  }
  const routeCount = report.routeCount ?? 0;
  return {
    ok: r.status === 0 && routeCount > 0,
    skip: r.status === 0 && routeCount > 0 ? null : `${origin}-lift-failed`,
    routeCount,
  };
}

async function ensureWebir(projectDir, origin) {
  return ensureProjectWebir(projectDir, origin);
}

/**
 * @param {{ rel: string, origin: string }} fixture
 */
async function exportWithProjection(fixture) {
  const projectDir = join(scriptRoot, fixture.rel);
  const ensured = await ensureWebir(projectDir, fixture.origin);
  if (!ensured.ok) {
    return {
      ok: false,
      fixture: fixture.rel,
      origin: fixture.origin,
      skip: ensured.skip ?? "webir-missing",
      routeCount: null,
      holeCount: null,
      exportSchemaVersion: null,
      cwlProjection: null,
    };
  }
  const meta = await exportProjectMigrationCwl(projectDir, { origin: fixture.origin });
  let cwlProjection = null;
  if (meta.ok && meta.webirPath && existsSync(meta.webirPath)) {
    const webir = await loadWebir();
    const raw = JSON.parse(readFileSync(meta.webirPath, "utf8"));
    cwlProjection = summarizeCwlProjection(webir.moduleFromGoldenSnapshot(raw));
  }
  return {
    ok:
      meta.ok === true &&
      (fixture.requireHoleFree === false
        ? meta.holeCount != null
        : meta.holeCount === 0) &&
      (fixture.minHoleFree == null || (cwlProjection?.holeFree ?? 0) >= fixture.minHoleFree),
    fixture: fixture.rel,
    origin: fixture.origin,
    requireHoleFree: fixture.requireHoleFree !== false,
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
    const block = await exportWithProjection(f);
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
