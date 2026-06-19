#!/usr/bin/env node
/**
 * Apply WISP Phase 13 M2 CWL surfaces — admin + customers module shells (CWL API + Pages + Data).
 * Interactive admin/CRM widgets remain CWL UI holes (sidecar); pattern generalizes beyond WISP POC.
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

export const WISP_M2_SURFACE_MANIFEST_KIND = "chrysalis.wisp.m2-surface-manifest";
export const WISP_M2_SURFACE_MANIFEST_SCHEMA_VERSION = 1;

const manifestPath = join(fixtureDir, "wisp-m2-surface-manifest.v1.json");

export const M2_API_SURFACES = ["/api/admin", "/api/customers"];

/** @type {{ path: string; pageName: string; area: string; title: string }[]} */
export const M2_ADMIN_ROUTES = [
  { path: "/admin/billing", pageName: "admin_billing_page", area: "billing", title: "Billing" },
  { path: "/admin/management", pageName: "admin_management_page", area: "management", title: "Management" },
  {
    path: "/admin/system-management",
    pageName: "admin_system_management_page",
    area: "system-management",
    title: "System Management",
  },
  {
    path: "/admin/tenant-management",
    pageName: "admin_tenant_management_page",
    area: "tenant-management",
    title: "Tenant Management",
  },
  {
    path: "/admin/tenants/:tenantId/modules",
    pageName: "admin_tenants_tenantId_modules_page",
    area: "tenant-modules",
    title: "Tenant Modules",
  },
];

export const M2_CUSTOMERS_MODULE_PATH = "/modules/customers";

export const M2_ADMIN_WIDGET_HOLES = [
  "TenantAdminGrid",
  "BillingAdminPanel",
  "SystemConfigEditor",
  "ModuleAssignmentMatrix",
];

export const M2_CUSTOMERS_WIDGET_HOLES = [
  "CrmDashboard",
  "CustomerDirectory",
  "PortalSetupWizard",
  "PortalBrandingEditor",
];

const ADMIN_NAV =
  '<nav class="admin-nav">\n  <a href="/admin/management">Management</a>\n  <a href="/admin/billing">Billing</a>\n  <a href="/admin/system-management">System</a>\n  <a href="/admin/tenant-management">Tenants</a>\n  <a href="/dashboard">← Dashboard</a>\n</nav>';

/** @param {string} title @param {string} area */
function adminShellHtml(title, area) {
  return `<svelte:head>\n  <title>${title} – WISP Admin</title>\n</svelte:head>\n\n<div class="admin-shell">\n  ${ADMIN_NAV}\n  <header>\n    <h1>${title}</h1>\n    <p class="admin-area">Area: ${area}</p>\n    <p class="api-surface">API: /api/admin (proxied upstream)</p>\n  </header>\n  <p class="ui-hole-note">Interactive admin widgets remain <code>hub-svelte:page-component</code> until CWL UI RFC-0012.</p>\n</div>`;
}

export const M2_CUSTOMERS_HTML =
  '<svelte:head>\n  <title>Customers – WISP Management</title>\n</svelte:head>\n\n<div class="customers-shell">\n  <header>\n    <h1>Customers Module</h1>\n    <p class="api-surface">API: /api/customers (proxied upstream)</p>\n  </header>\n  <section class="portal-links">\n    <h2>Customer Portal</h2>\n    <ul>\n      <li><a href="/modules/customers/portal">Portal home</a></li>\n      <li><a href="/modules/customers/portal-setup">Portal setup</a></li>\n      <li><a href="/modules/customers/portal/dashboard">Portal dashboard</a></li>\n      <li><a href="/modules/customers/portal/tickets">Tickets</a></li>\n      <li><a href="/modules/customers/portal/billing">Billing</a></li>\n      <li><a href="/modules/customers/portal/knowledge">Knowledge base</a></li>\n    </ul>\n  </section>\n  <p class="ui-hole-note">CRM widgets and portal sub-pages remain <code>hub-svelte:page-component</code> until CWL UI RFC-0012.</p>\n</div>';

/** @param {{ path: string; pageName: string; area: string; title: string }} route */
function buildAdminPageBlock(route) {
  return `@page GET "${route.path}"
page ${route.pageName} {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { adminArea: "${route.area}", source: "wisp-m2", apiPrefix: "/api/admin" };
  ${cwlHtmlReturn(adminShellHtml(route.title, route.area))}
}`;
}

/** Patch admin + customers routes → @page with load { … }. */
export function applyM2SurfacesToRoutesCwl() {
  if (!existsSync(routesPath)) return { ok: false, skip: "missing-routes-cwl" };
  let text = readFileSync(routesPath, "utf8");

  for (const route of M2_ADMIN_ROUTES) {
    const block = buildAdminPageBlock(route);
    const r = replaceRouteHandlerBlock(
      text,
      [`@route GET "${route.path}"`, `@page GET "${route.path}"`],
      block,
    );
    if (!r.ok) return r;
    text = r.text;
  }

  const customersBlock = `@page GET "${M2_CUSTOMERS_MODULE_PATH}"
page modules_customers_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "customers", source: "wisp-m2", apiPath: "/api/customers" };
  ${cwlHtmlReturn(M2_CUSTOMERS_HTML)}
}`;

  const customers = replaceRouteHandlerBlock(
    text,
    [`@route GET "${M2_CUSTOMERS_MODULE_PATH}"`, `@page GET "${M2_CUSTOMERS_MODULE_PATH}"`],
    customersBlock,
  );
  if (!customers.ok) return customers;
  text = customers.text;

  const adminNative = M2_ADMIN_ROUTES.every(
    (route) => text.includes(`@page GET "${route.path}"`) && !text.includes(`@route GET "${route.path}"`),
  );
  const customersNative =
    text.includes(`@page GET "${M2_CUSTOMERS_MODULE_PATH}"`) &&
    text.includes('load { module: "customers"') &&
    !/@route GET "\/modules\/customers"/.test(text);
  if (!adminNative || !customersNative) return { ok: false, skip: "m2-routes-not-applied" };

  writeFileSync(routesPath, text, "utf8");
  return { ok: true, routesPath, adminNative, customersNative };
}

/** Sync cwl-preview.json for M2 routes. */
export function applyM2SurfacesToPreview() {
  if (!existsSync(previewPath)) return { ok: false, skip: "missing-cwl-preview" };
  const json = JSON.parse(readFileSync(previewPath, "utf8"));
  const routes = json.routes ?? [];
  const m2Paths = [...M2_ADMIN_ROUTES.map((r) => r.path), M2_CUSTOMERS_MODULE_PATH];
  for (const r of routes) {
    if (m2Paths.includes(r.path)) {
      r.hole = false;
      r.holeReason = null;
      r.kind = "page";
      r.hasLoad = true;
    }
  }
  json.generatedAt = new Date().toISOString();
  writeFileSync(previewPath, `${JSON.stringify(json, null, 2)}\n`, "utf8");
  return { ok: true, previewPath, liftedCount: m2Paths.length };
}

/** Publish M2 surface manifest (CWL API + Data + UI hole catalog). */
export function buildM2SurfaceManifest() {
  const text = existsSync(routesPath) ? readFileSync(routesPath, "utf8") : "";
  const adminPages = M2_ADMIN_ROUTES.every((route) => text.includes(`@page GET "${route.path}"`));
  const customersPage = text.includes(`@page GET "${M2_CUSTOMERS_MODULE_PATH}"`);
  const customersLoad = text.includes('load { module: "customers"');
  const manifest = {
    kind: WISP_M2_SURFACE_MANIFEST_KIND,
    schemaVersion: WISP_M2_SURFACE_MANIFEST_SCHEMA_VERSION,
    ok: adminPages && customersPage && customersLoad,
    wave: "M2",
    surfaces: {
      api: M2_API_SURFACES,
      data: [
        ...M2_ADMIN_ROUTES.map((route) => ({
          path: route.path,
          load: ["adminArea", "source", "apiPrefix"],
        })),
        {
          path: M2_CUSTOMERS_MODULE_PATH,
          load: ["module", "source", "apiPath"],
        },
      ],
      pages: [...M2_ADMIN_ROUTES.map((r) => r.path), M2_CUSTOMERS_MODULE_PATH],
      uiWidgetHoles: [
        {
          host: "/admin/*",
          widgets: M2_ADMIN_WIDGET_HOLES,
          reason: "hub-svelte:page-component",
          rfc: "CWL-RFC-0012",
        },
        {
          host: M2_CUSTOMERS_MODULE_PATH,
          widgets: M2_CUSTOMERS_WIDGET_HOLES,
          reason: "hub-svelte:page-component",
          rfc: "CWL-RFC-0012",
        },
      ],
      portalUiHoles: {
        prefix: "/modules/customers/portal",
        reason: "hub-svelte:page-component",
        note: "Portal sub-routes lift in a later wave; API proxy contract covers /api/customers",
      },
    },
    adminPages,
    customersPage,
    customersLoad,
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { ...manifest, manifestPath };
}

/** @param {object} [opts] */
export function applyWispM2Surfaces(opts = {}) {
  const routes = opts.skipRoutes ? { ok: true, skip: "skip-routes" } : applyM2SurfacesToRoutesCwl();
  const preview = opts.skipPreview ? { ok: true, skip: "skip-preview" } : applyM2SurfacesToPreview();
  const manifest = buildM2SurfaceManifest();
  const ok = routes.ok === true && preview.ok === true && manifest.ok === true;
  return { ok, routes, preview, manifest };
}

async function main() {
  const r = applyWispM2Surfaces();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("wisp-cwl-apply-m2-surfaces")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
