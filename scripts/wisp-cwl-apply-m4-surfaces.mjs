#!/usr/bin/env node
/**
 * Apply WISP Phase 13 M4 — HSS + SNMP monitoring module shells (POC showcase).
 * GenieACS/ACS is WISPTools legacy — not Chrysalis POC scope (DESIGN D6205).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fixtureDir, routesPath } from "./wisp-cwl-apply-surfaces-lib.mjs";
import {
  applyLiftRoutesToCwl,
  buildLoadPageBlock,
  genericModuleShellHtml,
  patchPreviewPaths,
} from "./wisp-cwl-apply-module-routes-lib.mjs";

export const WISP_M4_SURFACE_MANIFEST_KIND = "chrysalis.wisp.m4-surface-manifest";
export const WISP_M4_SURFACE_MANIFEST_SCHEMA_VERSION = 1;

const manifestPath = join(fixtureDir, "wisp-m4-surface-manifest.v1.json");

export const M4_API_SURFACES = [
  "/api/hss",
  "/api/monitoring",
  "/api/snmp",
  "/api/monitoring/graphs",
];

const M4_NAV =
  '<nav class="m4-nav">\n  <a href="/modules/hss-management">HSS</a>\n  <a href="/modules/monitoring">Monitoring</a>\n</nav>';

/** @type {import("./wisp-cwl-apply-module-routes-lib.mjs").LiftRouteSpec[]} */
export const M4_MODULE_ROUTES = [
  {
    path: "/modules/hss-management",
    pageName: "modules_hss_management_page",
    module: "hss_management",
    section: "overview",
    title: "HSS Management",
    apiPath: "/api/hss",
    source: "wisp-m4",
    extraNote: "Open5GS HSS subscribers via proxied /api/hss.",
  },
  {
    path: "/modules/monitoring",
    pageName: "modules_monitoring_page",
    module: "monitoring",
    section: "overview",
    title: "SNMP Monitoring",
    apiPath: "/api/monitoring",
    source: "wisp-m4",
    extraNote: "SNMP graphs via /api/monitoring and /api/snmp.",
  },
];

/** @param {import("./wisp-cwl-apply-module-routes-lib.mjs").LiftRouteSpec} route */
function m4ShellHtml(route) {
  const base = genericModuleShellHtml(route);
  return base.replace("<div class=\"module-shell\">", `<div class="module-shell">\n  ${M4_NAV}`);
}

/** @param {import("./wisp-cwl-apply-module-routes-lib.mjs").LiftRouteSpec} route */
function buildM4Block(route) {
  return buildLoadPageBlock(route, m4ShellHtml(route));
}

export function applyM4SurfacesToRoutesCwl() {
  if (!existsSync(routesPath)) return { ok: false, skip: "missing-routes-cwl" };
  let text = readFileSync(routesPath, "utf8");
  const applied = applyLiftRoutesToCwl(text, M4_MODULE_ROUTES, buildM4Block);
  if (!applied.ok) return applied;
  text = applied.text;
  const native = M4_MODULE_ROUTES.every(
    (r) => text.includes(`@page GET "${r.path}"`) && !text.includes(`@route GET "${r.path}"`),
  );
  if (!native) return { ok: false, skip: "m4-routes-not-applied" };
  writeFileSync(routesPath, text, "utf8");
  return { ok: true, routesPath, lifted: M4_MODULE_ROUTES.length };
}

export function applyM4SurfacesToPreview() {
  return patchPreviewPaths(M4_MODULE_ROUTES.map((r) => r.path));
}

export function buildM4SurfaceManifest() {
  const text = existsSync(routesPath) ? readFileSync(routesPath, "utf8") : "";
  const hssNative = text.includes('@page GET "/modules/hss-management"');
  const monitoringNative = text.includes('@page GET "/modules/monitoring"');
  const manifest = {
    kind: WISP_M4_SURFACE_MANIFEST_KIND,
    schemaVersion: WISP_M4_SURFACE_MANIFEST_SCHEMA_VERSION,
    ok: hssNative && monitoringNative,
    wave: "M4",
    surfaces: {
      api: M4_API_SURFACES,
      data: M4_MODULE_ROUTES.map((r) => ({
        path: r.path,
        load: ["module", "section", "source", "apiPath"],
      })),
      pages: M4_MODULE_ROUTES.map((r) => r.path),
      backendPolicy: {
        hss: "proxy-only — /api/hss",
        monitoring: "proxy-only — /api/monitoring, /api/snmp",
      },
      uiWidgetHoles: [
        {
          host: "/modules/hss-management",
          widgets: ["SubscriberGrid", "HssProfileEditor"],
          reason: "hub-svelte:page-component",
          rfc: "CWL-RFC-0012",
        },
        {
          host: "/modules/monitoring",
          widgets: ["SnmpGraphPanel", "AlertTimeline"],
          reason: "hub-svelte:page-component",
          rfc: "CWL-RFC-0012",
        },
      ],
    },
    hssNative,
    monitoringNative,
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { ...manifest, manifestPath };
}

/** @param {object} [opts] */
export function applyWispM4Surfaces(opts = {}) {
  const routes = opts.skipRoutes ? { ok: true, skip: "skip-routes" } : applyM4SurfacesToRoutesCwl();
  const preview = opts.skipPreview ? { ok: true, skip: "skip-preview" } : applyM4SurfacesToPreview();
  const manifest = buildM4SurfaceManifest();
  const ok = routes.ok === true && preview.ok === true && manifest.ok === true;
  return { ok, routes, preview, manifest };
}

async function main() {
  const r = applyWispM4Surfaces();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("wisp-cwl-apply-m4-surfaces")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
