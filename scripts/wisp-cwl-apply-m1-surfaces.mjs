#!/usr/bin/env node
/**
 * Apply WISP Phase 13 M1 CWL surfaces — CWL Data (`load`) + Pages shell on /dashboard.
 * Interactive widgets remain CWL UI holes (sidecar); pattern generalizes beyond WISP POC.
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

export const WISP_M1_SURFACE_MANIFEST_KIND = "chrysalis.wisp.m1-surface-manifest";
export const WISP_M1_SURFACE_MANIFEST_SCHEMA_VERSION = 1;

const manifestPath = join(fixtureDir, "wisp-m1-surface-manifest.v1.json");

/** Static dashboard shell — tenantLabel interpolated from load (RFC-0014). */
export const M1_DASHBOARD_HTML =
  '<svelte:head>\n  <title>Dashboard – WISP Management</title>\n</svelte:head>\n\n<div class="dashboard-shell">\n  <header>\n    <h1>Dashboard</h1>\n    <p class="tenant">Tenant: tenantLabel</p>\n  </header>\n  <section class="modules">\n    <h2>Modules</h2>\n    <ul>\n      <li><a href="/modules/plan">Plan</a> – coverage and site planning</li>\n      <li><a href="/modules/deploy">Deploy</a> – rollouts and work orders</li>\n      <li><a href="/modules/monitor">Monitor</a> – SNMP and performance</li>\n      <li><a href="/modules/maintain">Maintain</a> – tickets and maintenance</li>\n      <li><a href="/modules/customers">Customers</a> – CRM and portal</li>\n      <li><a href="/modules/hardware">Hardware</a> – inventory and RMA</li>\n    </ul>\n  </section>\n  <section class="wizards">\n    <p><a href="/wizards">Wizards</a> – guided flows</p>\n  </section>\n  <p class="ui-hole-note">Interactive widgets (tenant guard, notifications, module cards, settings) remain <code>hub-svelte:page-component</code> until CWL UI RFC-0012.</p>\n</div>';

export const M1_DASHBOARD_WIDGET_HOLES = [
  "TenantGuard",
  "NotificationCenter",
  "ModuleCardGrid",
  "GlobalSettings",
  "FirstTimeSetupWizard",
];

/** Patch /dashboard → @page with load { … }. */
export function applyM1SurfacesToRoutesCwl() {
  if (!existsSync(routesPath)) return { ok: false, skip: "missing-routes-cwl" };
  let text = readFileSync(routesPath, "utf8");

  const dashboardBlock = `@page GET "/dashboard"
page dashboard_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { tenantLabel: "WISP Tenant", source: "wisp-m1", moduleCount: 6 };
  ${cwlHtmlReturn(M1_DASHBOARD_HTML)}
}`;

  const r = replaceRouteHandlerBlock(
    text,
    ['@route GET "/dashboard"', '@page GET "/dashboard"'],
    dashboardBlock,
  );
  if (!r.ok) return r;
  text = r.text;

  const verified =
    text.includes('@page GET "/dashboard"') &&
    text.includes("load { tenantLabel:") &&
    !/@route GET "\/dashboard"/.test(text);
  if (!verified) return { ok: false, skip: "m1-routes-not-applied" };

  writeFileSync(routesPath, text, "utf8");
  return { ok: true, routesPath };
}

/** Sync cwl-preview.json for /dashboard. */
export function applyM1SurfacesToPreview() {
  if (!existsSync(previewPath)) return { ok: false, skip: "missing-cwl-preview" };
  const json = JSON.parse(readFileSync(previewPath, "utf8"));
  const routes = json.routes ?? [];
  for (const r of routes) {
    if (r.path === "/dashboard") {
      r.hole = false;
      r.holeReason = null;
      r.kind = "page";
      r.hasLoad = true;
    }
  }
  json.generatedAt = new Date().toISOString();
  writeFileSync(previewPath, `${JSON.stringify(json, null, 2)}\n`, "utf8");
  return { ok: true, previewPath };
}

/** Publish M1 surface manifest (CWL Data + UI hole catalog). */
export function buildM1SurfaceManifest() {
  const text = existsSync(routesPath) ? readFileSync(routesPath, "utf8") : "";
  const dashboardPage = text.includes('@page GET "/dashboard"');
  const dashboardLoad = text.includes('load { tenantLabel:');
  const manifest = {
    kind: WISP_M1_SURFACE_MANIFEST_KIND,
    schemaVersion: WISP_M1_SURFACE_MANIFEST_SCHEMA_VERSION,
    ok: dashboardPage && dashboardLoad,
    wave: "M1",
    surfaces: {
      data: [{ path: "/dashboard", load: ["tenantLabel", "source", "moduleCount"] }],
      pages: ["/dashboard"],
      uiWidgetHoles: [
        {
          host: "/dashboard",
          widgets: M1_DASHBOARD_WIDGET_HOLES,
          reason: "hub-svelte:page-component",
          rfc: "CWL-RFC-0012",
        },
      ],
    },
    dashboardPage,
    dashboardLoad,
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { ...manifest, manifestPath };
}

/** @param {object} [opts] */
export function applyWispM1Surfaces(opts = {}) {
  const routes = opts.skipRoutes ? { ok: true, skip: "skip-routes" } : applyM1SurfacesToRoutesCwl();
  const preview = opts.skipPreview ? { ok: true, skip: "skip-preview" } : applyM1SurfacesToPreview();
  const manifest = buildM1SurfaceManifest();
  const ok = routes.ok === true && preview.ok === true && manifest.ok === true;
  return { ok, routes, preview, manifest };
}

async function main() {
  const r = applyWispM1Surfaces();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("wisp-cwl-apply-m1-surfaces")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
