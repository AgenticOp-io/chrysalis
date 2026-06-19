#!/usr/bin/env node
/**
 * Scan WISP Module_Manager for integration scenarios → manifest JSON.
 * Usage: node scripts/wisp-cwl-scenario-inventory.mjs [--root path] [--out fixtures/hub-wisp-management/wisp-scenarios.v1.json]
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

export const WISP_SCENARIO_INVENTORY_KIND = "chrysalis.wisp.scenario-inventory";
export const WISP_SCENARIO_INVENTORY_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultRoot =
  process.env.CHRYSALIS_WISP_ROOT ??
  process.env.WISP_MODULE_DIR ??
  "C:/Users/david/Downloads/WISPTools/Module_Manager";
const defaultOut = join(scriptRoot, "fixtures/hub-wisp-management/wisp-scenarios.v1.json");

/** @param {string} dir */
function walkFiles(dir, acc = [], depth = 0) {
  if (depth > 14 || !existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git" || name === "build") continue;
    const p = join(dir, name);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) walkFiles(p, acc, depth + 1);
    else acc.push(p);
  }
  return acc;
}

/** @param {string} root */
export function buildWispScenarioInventory(root) {
  const moduleRoot = resolve(root);
  const routesRoot = join(moduleRoot, "src/routes");
  const libRoot = join(moduleRoot, "src/lib");
  const files = [...walkFiles(routesRoot), ...walkFiles(libRoot)];

  const textOf = (sub) => files.filter((f) => f.replace(/\\/g, "/").includes(sub)).map((f) => relative(moduleRoot, f));

  const sveltePages = files.filter((f) => /[/\\]\+page\.svelte$/.test(f)).length;
  const layouts = files.filter((f) => /[/\\]\+layout\.svelte$/.test(f)).length;
  const pageServer = files.filter((f) => /[/\\]\+page\.server\.(ts|js)$/.test(f)).length;
  const serverRoutes = files.filter((f) => /[/\\]\+server\.(ts|js)$/.test(f)).length;

  const scenarios = [
    {
      id: "platform-shell",
      category: "auth",
      summary: "Root layout auth guard and public routes",
      files: textOf("src/routes/+layout.svelte").slice(0, 3),
      cwlPhase: 2,
      hole: "hub-svelte:page-component",
    },
    {
      id: "firebase-auth",
      category: "auth",
      summary: "Firebase client auth (email, Google OAuth)",
      files: textOf("authService").concat(textOf("login/+page.svelte")).slice(0, 5),
      cwlPhase: 1,
      hole: "hub-svelte:firebase-auth",
    },
    {
      id: "tenant-guard",
      category: "auth",
      summary: "TenantGuard and tenantStore",
      files: textOf("TenantGuard").concat(textOf("tenantStore")).slice(0, 4),
      cwlPhase: 2,
      hole: "hub-svelte:page-component",
    },
    {
      id: "api-jwt-tenant",
      category: "api",
      summary: "apiService JWT + X-Tenant-ID on REST calls",
      files: textOf("apiService.ts"),
      cwlPhase: 1,
      hole: "hub-cwl:upstream-proxy",
    },
    {
      id: "backend-mongodb",
      category: "api",
      summary: "Existing Express/MongoDB backend on acs-hss-server — proxy only; no CWL conversion (GenieACS binaries stay operator-owned)",
      files: ["../backend-services/server.js"],
      cwlPhase: 1,
      hole: "hub-cwl:upstream-proxy",
      backendConversion: "deferred",
    },
    {
      id: "genieacs-tr069",
      category: "backend",
      summary: "GenieACS TR-069 — own binaries on backend VM; out of scope for UI CWL program",
      files: ["../genieacs-fork"],
      cwlPhase: null,
      hole: null,
      backendConversion: "deferred",
    },
    {
      id: "arcgis-mapview",
      category: "maps",
      summary: "ArcGIS MapView, widgets, @arcgis/core dynamic imports",
      files: textOf("arcgisMapController").concat(textOf("CoverageMapView")),
      cwlPhase: 4,
      hole: "hub-svelte:arcgis-map",
    },
    {
      id: "shared-map-iframe",
      category: "maps",
      summary: "SharedMap iframe postMessage plan ↔ coverage-map",
      files: textOf("SharedMap.svelte"),
      cwlPhase: 4,
      hole: "hub-svelte:cross-frame-messaging",
    },
    {
      id: "arcgis-geocode",
      category: "maps",
      summary: "ArcGIS geocode REST from plan module",
      files: textOf("modules/plan/+page.svelte"),
      cwlPhase: 4,
      hole: "hub-svelte:arcgis-map",
    },
    {
      id: "echarts-monitoring",
      category: "charts",
      summary: "echarts monitoring graphs",
      files: files.filter((f) => f.includes("echarts")).map((f) => relative(moduleRoot, f)).slice(0, 5),
      cwlPhase: 4,
      hole: "hub-svelte:chart-component",
    },
    {
      id: "static-docs",
      category: "pages",
      summary: "Static docs pages liftable to CWL @page",
      files: textOf("routes/docs/").slice(0, 6),
      cwlPhase: 0,
      hole: null,
    },
  ];

  const modulesDir = join(routesRoot, "modules");
  /** @type {string[]} */
  const modules = existsSync(modulesDir)
    ? readdirSync(modulesDir).filter((n) => statSync(join(modulesDir, n)).isDirectory())
    : [];

  return {
    kind: WISP_SCENARIO_INVENTORY_KIND,
    schemaVersion: WISP_SCENARIO_INVENTORY_SCHEMA_VERSION,
    ok: existsSync(routesRoot),
    moduleRoot,
    counts: {
      sveltePages,
      layouts,
      pageServer,
      serverRoutes,
      libFiles: existsSync(libRoot) ? walkFiles(libRoot).length : 0,
      modules: modules.length,
    },
    modules,
    scenarios,
    generatedAt: new Date().toISOString(),
  };
}

function parseArgs(argv) {
  let root = defaultRoot;
  let out = defaultOut;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--root" && argv[i + 1]) root = argv[++i];
    else if (argv[i] === "--out" && argv[i + 1]) out = argv[++i];
  }
  return { root, out: resolve(out) };
}

async function main() {
  const { root, out } = parseArgs(process.argv);
  const report = buildWispScenarioInventory(root);
  writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ...report, outPath: out }, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1]?.includes("wisp-cwl-scenario-inventory");
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
