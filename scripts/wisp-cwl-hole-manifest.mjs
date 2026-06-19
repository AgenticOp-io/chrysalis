#!/usr/bin/env node
/**
 * Publish WISP hole manifest v1 from cwl-preview + api-proxy contract + hole budget.
 * Usage: node scripts/wisp-cwl-hole-manifest.mjs [--preview path] [--out fixtures/hub-wisp-management/wisp-hole-manifest.v1.json]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const WISP_HOLE_MANIFEST_KIND = "chrysalis.wisp.hole-manifest";
export const WISP_HOLE_MANIFEST_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixtureDir = join(scriptRoot, "fixtures/hub-wisp-management");
const defaultOut = join(fixtureDir, "wisp-hole-manifest.v1.json");
const wispRoot =
  process.env.CHRYSALIS_WISP_ROOT ??
  process.env.WISP_MODULE_DIR ??
  "C:/Users/david/Downloads/WISPTools/Module_Manager";

/**
 * @param {object} [opts]
 * @param {string} [opts.previewPath]
 * @param {string} [opts.outPath]
 */
export function buildWispHoleManifest(opts = {}) {
  const previewPath =
    opts.previewPath ??
    (existsSync(join(fixtureDir, "cwl-preview.json"))
      ? join(fixtureDir, "cwl-preview.json")
      : existsSync(join(wispRoot, ".chrysalis/cwl-preview.json"))
        ? join(wispRoot, ".chrysalis/cwl-preview.json")
        : join(fixtureDir, "cwl-preview.json"));
  const outPath = resolve(opts.outPath ?? defaultOut);
  const budgetPath = join(fixtureDir, "chrysalis.fullstack-hole-budget.json");
  const apiProxyPath = join(fixtureDir, "api-proxy.cwl");

  const base = {
    kind: WISP_HOLE_MANIFEST_KIND,
    schemaVersion: WISP_HOLE_MANIFEST_SCHEMA_VERSION,
    ok: false,
  };

  if (!existsSync(previewPath)) {
    return { ...base, skip: "missing-cwl-preview", previewPath };
  }
  if (!existsSync(budgetPath)) {
    return { ...base, skip: "missing-hole-budget", budgetPath };
  }

  const preview = JSON.parse(readFileSync(previewPath, "utf8"));
  const budget = JSON.parse(readFileSync(budgetPath, "utf8"));
  const routes = preview.routes ?? [];
  const holed = routes.filter((r) => r.hole === true);
  /** @type {Record<string, number>} */
  const byReason = {};
  for (const r of holed) {
    const reason = r.holeReason ?? "unknown";
    byReason[reason] = (byReason[reason] ?? 0) + 1;
  }

  let apiProxyRoutes = 0;
  if (existsSync(apiProxyPath)) {
    const text = readFileSync(apiProxyPath, "utf8");
    apiProxyRoutes = (text.match(/^@route /gm) ?? []).length;
  }

  const uiHoleCount = holed.length;
  const totalUiHoles = Object.values(byReason).reduce((a, b) => a + b, 0);
  const maxHoles = budget.maxHoles ?? 120;
  const expected = new Set(budget.expectedHoleReasons ?? []);
  const unexpected = Object.keys(byReason).filter((k) => !expected.has(k) && k !== "unknown");
  const withinBudget = totalUiHoles <= maxHoles;
  const ok = withinBudget && unexpected.length === 0 && routes.length >= 87 && apiProxyRoutes >= 20;

  const manifest = {
    ...base,
    ok,
    previewPath,
    routeCount: routes.length,
    uiHoleCount,
    apiProxyRouteCount: apiProxyRoutes,
    totalUiHoles,
    maxHoles,
    withinBudget,
    byReason,
    unexpectedReasons: unexpected,
    backendConversion: "deferred",
    backendPolicy: "proxy-only — backend-services and GenieACS unchanged on acs-hss-server",
    generatedAt: new Date().toISOString(),
  };

  writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { ...manifest, outPath };
}

function parseArgs(argv) {
  let previewPath = "";
  let out = defaultOut;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--preview" && argv[i + 1]) previewPath = argv[++i];
    else if (argv[i] === "--out" && argv[i + 1]) out = argv[++i];
  }
  return { previewPath: previewPath ? resolve(previewPath) : undefined, outPath: resolve(out) };
}

async function main() {
  const args = parseArgs(process.argv);
  const r = buildWispHoleManifest(args);
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok && !r.skip) process.exit(1);
}

if (process.argv[1]?.includes("wisp-cwl-hole-manifest")) main().catch((e) => { console.error(e); process.exit(1); });
