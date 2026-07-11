#!/usr/bin/env node
/**
 * Project-to-CWL: project WebIR → .chrysalis/migration.cwl (+ export meta).
 * v1 (G134): uses the rich `listCwlRoutes` projection (status, params, `??`
 * defaults, content-type, object/array bodies) so the migration contract is
 * hole-free for the flagships, replacing the original literal-only projection.
 */
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadWebir } from "./shared.mjs";
import { listCwlRoutes, renderCwlRoutes, summarizeCwlProjection } from "./hub-webir-routes.mjs";
import { checkFullstackHoleBudget, readFullstackHoleBudget } from "./hub-cwl-fullstack-hole-budget.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadEmitShared() {
  try {
    return await import("@chrysalis/emit-shared");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/emit-shared/dist/index.js")).href);
  }
}

/**
 * Patch projected CWL `@page` bodies with lifted markup when
 * `.chrysalis/ui-markup/` artifacts exist (G9309).
 * @param {string} projectDir
 * @param {string} cwlText
 */
export async function applyProjectUiMarkupToCwl(projectDir, cwlText) {
  const uiMarkupDir = join(resolve(projectDir), ".chrysalis", "ui-markup");
  const emitShared = await loadEmitShared();
  const loaded = emitShared.loadUiMarkupLiftArtifacts(uiMarkupDir);
  if (loaded === null) return { skip: "no-ui-markup-artifacts", text: cwlText, routesPatched: 0 };
  const patched = emitShared.applyLiftedMarkupToCwlSource(cwlText, loaded.map, loaded.bundles);
  return { ...patched, skip: null };
}

export const HUB_CWL_EXPORT_KIND = "chrysalis.hub.cwl-export";
// v3: export meta carries cwlProjection summary (G179).
export const HUB_CWL_EXPORT_SCHEMA_VERSION = 3;

/**
 * Project a WebIR module's routes to a CWL migration contract using the shared
 * rich projection (`listCwlRoutes` + `renderCwlRoutes`).
 * @param {ReturnType<typeof listCwlRoutes>} routes
 * @param {string} origin
 */
export function renderMigrationCwl(routes, origin) {
  return renderCwlRoutes(routes, {
    header: `# Chrysalis migration contract — projected from ${origin} WebIR`,
    moduleName: "migration",
  });
}

/**
 * @param {string} projectDir
 * @param {string} [origin]
 */
export async function resolveProjectWebirPath(projectDir, origin = "php") {
  const root = resolve(projectDir);
  const candidates = [
    join(root, ".chrysalis", `hub.${origin}.webir.json`),
    join(root, ".chrysalis", "ingested.webir.json"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

/**
 * @param {string} projectDir
 * @param {{ origin?: string, outBasename?: string }} [opts]
 */
export async function exportProjectMigrationCwl(projectDir, opts = {}) {
  const origin = opts.origin ?? "php";
  const webirPath = await resolveProjectWebirPath(projectDir, origin);
  if (!webirPath) {
    return { ok: false, reason: "no-webir", origin };
  }
  const webir = await loadWebir();
  const raw = JSON.parse(readFileSync(webirPath, "utf8"));
  const mod = webir.moduleFromGoldenSnapshot(raw);
  const routes = listCwlRoutes(mod);
  const cwlProjection = summarizeCwlProjection(mod);
  const pageCount = routes.filter((r) => r.surfaceKind === "page").length;
  const apiCount = routes.filter((r) => (r.surfaceKind ?? "api") === "api").length;
  const { text, holeCount, routeCount } = renderMigrationCwl(routes, origin);
  const outDir = join(resolve(projectDir), ".chrysalis");
  const cwlName = opts.outBasename ?? "migration.cwl";
  const cwlPath = join(outDir, cwlName);
  await mkdir(outDir, { recursive: true });
  let cwlText = text;
  const uiMarkupPatch = await applyProjectUiMarkupToCwl(projectDir, cwlText);
  if (uiMarkupPatch.text) cwlText = uiMarkupPatch.text;
  await writeFile(cwlPath, cwlText, "utf8");

  const budgetRead = await readFullstackHoleBudget(resolve(projectDir));
  const budgetCheck = budgetRead.ok
    ? checkFullstackHoleBudget(budgetRead.budget, { holeCount, routeCount, pageCount, apiCount })
    : null;

  const meta = {
    kind: HUB_CWL_EXPORT_KIND,
    schemaVersion: HUB_CWL_EXPORT_SCHEMA_VERSION,
    ok: true,
    origin,
    webirPath,
    cwlPath,
    routeCount,
    holeCount,
    cwlProjection,
    fullstackHoleBudget: budgetRead.ok ? budgetRead.budget : null,
    fullstackHoleBudgetCheck: budgetCheck,
    uiMarkup: uiMarkupPatch.skip
      ? { skip: uiMarkupPatch.skip, routesPatched: 0 }
      : {
          routesPatched: uiMarkupPatch.routesPatched ?? 0,
          routesSkipped: uiMarkupPatch.routesSkipped ?? 0,
          routesWithoutBundle: uiMarkupPatch.routesWithoutBundle ?? 0,
        },
    generatedAt: new Date().toISOString(),
  };
  await writeFile(join(outDir, "cwl-export.json"), `${JSON.stringify(meta, null, 2)}\n`, "utf8");
  return meta;
}

function parseArgs(argv) {
  let projectDir = null;
  let origin = "php";
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--project" && argv[i + 1]) projectDir = resolve(argv[++i]);
    else if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
  }
  if (!projectDir) {
    throw new Error("usage: hub-project-cwl-export.mjs --project <dir> [--origin php]");
  }
  return { projectDir, origin };
}

async function main() {
  const { projectDir, origin } = parseArgs(process.argv);
  const meta = await exportProjectMigrationCwl(projectDir, { origin });
  console.log(JSON.stringify(meta, null, 2));
  if (!meta.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
