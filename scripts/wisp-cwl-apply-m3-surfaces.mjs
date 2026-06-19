#!/usr/bin/env node
/**
 * Apply WISP Phase 13 M3 CWL surfaces — plan, deploy, coverage-map module shells.
 * ArcGIS MapView/geocode remain hub-svelte:arcgis-map client holes (CWL UI policy).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  cwlHtmlReturn,
  replaceRouteHandlerBlock,
  routesPath,
  previewPath,
  fixtureDir,
} from "./wisp-cwl-apply-surfaces-lib.mjs";

export const WISP_M3_SURFACE_MANIFEST_KIND = "chrysalis.wisp.m3-surface-manifest";
export const WISP_M3_SURFACE_MANIFEST_SCHEMA_VERSION = 1;

const manifestPath = join(fixtureDir, "wisp-m3-surface-manifest.v1.json");

export const M3_API_SURFACES = ["/api/plans", "/api/deploy", "/api/network"];

/** @type {{ path: string; pageName: string; module: string; title: string; apiPath: string; blurb: string }[]} */
export const M3_MODULE_ROUTES = [
  {
    path: "/modules/plan",
    pageName: "modules_plan_page",
    module: "plan",
    title: "Plan",
    apiPath: "/api/plans",
    blurb: "Coverage and site planning",
  },
  {
    path: "/modules/deploy",
    pageName: "modules_deploy_page",
    module: "deploy",
    title: "Deploy",
    apiPath: "/api/deploy",
    blurb: "Rollouts and work orders",
  },
  {
    path: "/modules/coverage-map",
    pageName: "modules_coverage_map_page",
    module: "coverage-map",
    title: "Coverage Map",
    apiPath: "/api/network",
    blurb: "Network coverage visualization",
  },
];

export const M3_PLAN_WIDGET_HOLES = ["SitePlanner", "PlanEditor", "CoverageAnalysis"];

export const M3_DEPLOY_WIDGET_HOLES = ["WorkOrderBoard", "RolloutScheduler", "DeploymentTracker"];

export const M3_COVERAGE_ARCGIS_HOLES = ["ArcGISMapView", "CoverageLayerControls", "MapLegend"];

const MODULE_NAV =
  '<nav class="module-nav">\n  <a href="/modules/plan">Plan</a>\n  <a href="/modules/deploy">Deploy</a>\n  <a href="/modules/coverage-map">Coverage Map</a>\n  <a href="/dashboard">← Dashboard</a>\n</nav>';

/** @param {{ title: string; module: string; apiPath: string; blurb: string }} route */
function moduleShellHtml(route) {
  const arcgisNote =
    route.module === "coverage-map"
      ? '\n  <p class="client-hole-note">ArcGIS MapView remains <code>hub-svelte:arcgis-map</code> (client bundle) until CWL UI policy.</p>'
      : route.module === "plan"
        ? '\n  <p class="client-hole-note">ArcGIS geocode client calls remain <code>hub-svelte:arcgis-map</code>.</p>'
        : "";
  return `<svelte:head>\n  <title>${route.title} – WISP Management</title>\n</svelte:head>\n\n<div class="module-shell">\n  ${MODULE_NAV}\n  <header>\n    <h1>${route.title}</h1>\n    <p class="module-blurb">${route.blurb}</p>\n    <p class="api-surface">API: ${route.apiPath} (proxied upstream)</p>\n  </header>${arcgisNote}\n  <p class="ui-hole-note">Interactive module widgets remain <code>hub-svelte:page-component</code> until CWL UI RFC-0012.</p>\n</div>`;
}

/** @param {{ path: string; pageName: string; module: string; title: string; apiPath: string; blurb: string }} route */
function buildModulePageBlock(route) {
  return `@page GET "${route.path}"
page ${route.pageName} {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "${route.module}", source: "wisp-m3", apiPath: "${route.apiPath}" };
  ${cwlHtmlReturn(moduleShellHtml(route))}
}`;
}

/** Patch plan/deploy/coverage-map → @page with load { … }. */
export function applyM3SurfacesToRoutesCwl() {
  if (!existsSync(routesPath)) return { ok: false, skip: "missing-routes-cwl" };
  let text = readFileSync(routesPath, "utf8");

  for (const route of M3_MODULE_ROUTES) {
    const block = buildModulePageBlock(route);
    const r = replaceRouteHandlerBlock(
      text,
      [`@route GET "${route.path}"`, `@page GET "${route.path}"`],
      block,
    );
    if (!r.ok) return r;
    text = r.text;
  }

  const modulesNative = M3_MODULE_ROUTES.every(
    (route) =>
      text.includes(`@page GET "${route.path}"`) &&
      text.includes(`module: "${route.module}"`) &&
      !text.includes(`@route GET "${route.path}"`),
  );
  if (!modulesNative) return { ok: false, skip: "m3-routes-not-applied" };

  writeFileSync(routesPath, text, "utf8");
  return { ok: true, routesPath, modulesNative };
}

/** Sync cwl-preview.json for M3 routes. */
export function applyM3SurfacesToPreview() {
  if (!existsSync(previewPath)) return { ok: false, skip: "missing-cwl-preview" };
  const json = JSON.parse(readFileSync(previewPath, "utf8"));
  const routes = json.routes ?? [];
  const m3Paths = M3_MODULE_ROUTES.map((r) => r.path);
  for (const r of routes) {
    if (m3Paths.includes(r.path)) {
      r.hole = false;
      r.holeReason = null;
      r.kind = "page";
      r.hasLoad = true;
    }
  }
  json.generatedAt = new Date().toISOString();
  writeFileSync(previewPath, `${JSON.stringify(json, null, 2)}\n`, "utf8");
  return { ok: true, previewPath, liftedCount: m3Paths.length };
}

/** Publish M3 surface manifest (CWL API + Data + ArcGIS client holes). */
export function buildM3SurfaceManifest() {
  const text = existsSync(routesPath) ? readFileSync(routesPath, "utf8") : "";
  const modulePages = M3_MODULE_ROUTES.every((route) => text.includes(`@page GET "${route.path}"`));
  const moduleLoads = M3_MODULE_ROUTES.every((route) => text.includes(`module: "${route.module}"`));
  const manifest = {
    kind: WISP_M3_SURFACE_MANIFEST_KIND,
    schemaVersion: WISP_M3_SURFACE_MANIFEST_SCHEMA_VERSION,
    ok: modulePages && moduleLoads,
    wave: "M3",
    surfaces: {
      api: M3_API_SURFACES,
      data: M3_MODULE_ROUTES.map((route) => ({
        path: route.path,
        load: ["module", "source", "apiPath"],
      })),
      pages: M3_MODULE_ROUTES.map((r) => r.path),
      uiWidgetHoles: [
        {
          host: "/modules/plan",
          widgets: M3_PLAN_WIDGET_HOLES,
          reason: "hub-svelte:page-component",
          rfc: "CWL-RFC-0012",
        },
        {
          host: "/modules/deploy",
          widgets: M3_DEPLOY_WIDGET_HOLES,
          reason: "hub-svelte:page-component",
          rfc: "CWL-RFC-0012",
        },
      ],
      clientHoles: [
        {
          host: "/modules/coverage-map",
          widgets: M3_COVERAGE_ARCGIS_HOLES,
          reason: "hub-svelte:arcgis-map",
          rfc: "CWL-RFC-0012",
          note: "ArcGIS @arcgis/core MapView — client bundle required",
        },
        {
          host: "/modules/plan",
          widgets: ["ArcGisGeocodeClient"],
          reason: "hub-svelte:arcgis-map",
          rfc: "CWL-RFC-0012",
          note: "Geocode REST from plan module",
        },
      ],
    },
    modulePages,
    moduleLoads,
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { ...manifest, manifestPath };
}

/** @param {object} [opts] */
export function applyWispM3Surfaces(opts = {}) {
  const routes = opts.skipRoutes ? { ok: true, skip: "skip-routes" } : applyM3SurfacesToRoutesCwl();
  const preview = opts.skipPreview ? { ok: true, skip: "skip-preview" } : applyM3SurfacesToPreview();
  const manifest = buildM3SurfaceManifest();
  const ok = routes.ok === true && preview.ok === true && manifest.ok === true;
  return { ok, routes, preview, manifest };
}

async function main() {
  const r = applyWispM3Surfaces();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("wisp-cwl-apply-m3-surfaces")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
