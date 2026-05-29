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
import { fileURLToPath } from "node:url";
import { loadWebir } from "./shared.mjs";
import { listCwlRoutes, renderCwlRoutes } from "./hub-webir-routes.mjs";

export const HUB_CWL_EXPORT_KIND = "chrysalis.hub.cwl-export";
// v2: rich projection (status/params/`??` defaults/content-type/object bodies)
// via `listCwlRoutes`, replacing the v0 literal-only projection.
export const HUB_CWL_EXPORT_SCHEMA_VERSION = 2;

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
  const { text, holeCount, routeCount } = renderMigrationCwl(routes, origin);
  const outDir = join(resolve(projectDir), ".chrysalis");
  const cwlName = opts.outBasename ?? "migration.cwl";
  const cwlPath = join(outDir, cwlName);
  await mkdir(outDir, { recursive: true });
  await writeFile(cwlPath, text, "utf8");

  const meta = {
    kind: HUB_CWL_EXPORT_KIND,
    schemaVersion: HUB_CWL_EXPORT_SCHEMA_VERSION,
    ok: true,
    origin,
    webirPath,
    cwlPath,
    routeCount,
    holeCount,
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
