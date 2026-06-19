#!/usr/bin/env node
/**
 * Apply WISP Phase 13 M0 CWL surfaces to fixtures/hub-wisp-management.
 * Surfaces: CWL Pages for /docs/* (incl. project-status) and /help; CWL UI hole for /login.
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

export const WISP_M0_SURFACE_MANIFEST_KIND = "chrysalis.wisp.m0-surface-manifest";
export const WISP_M0_SURFACE_MANIFEST_SCHEMA_VERSION = 1;

const manifestPath = join(fixtureDir, "wisp-m0-surface-manifest.v1.json");

export const M0_PROJECT_STATUS_HTML =
  '<svelte:head>\n  <title>Project Status &amp; Next Steps – WISP Management Docs</title>\n</svelte:head>\n\n<article class="doc-article">\n  <h1>Project Status &amp; Next Steps</h1>\n  <p class="intro">This page summarizes where the project stands and what to work on next. For the full lists, see the markdown files in the repository <code>docs/</code> folder.</p>\n  <div class="doc-body">\n<h2>Where We Are</h2>\n<ul>\n  <li><strong>Frontend:</strong> Firebase Hosting. Deploy: <code>npm run build</code> in Module_Manager, then <code>firebase deploy --only hosting:app</code>.</li>\n  <li><strong>Backend:</strong> GCE VM. Deploy: <code>deploy-backend-to-gce.ps1</code> (Upload or Git).</li>\n  <li><strong>Functions:</strong> <code>firebase deploy --only functions</code>.</li>\n  <li><strong>Wizards:</strong> All 19+ wizards implemented and in-app. Access via <code>/wizards</code> or each module\'s wizard menu.</li>\n  <li><strong>Customer Portal:</strong> Branding, tickets, billing, FAQ, KB at <code>/modules/customers/portal/*</code>.</li>\n  <li><strong>Documentation:</strong> Integrated at <code>/help</code> and <code>/docs</code>.</li>\n</ul>\n\n<h2>Next Items (Optional / Polish)</h2>\n<ol>\n  <li><strong>Documentation:</strong> Add frontmatter to more <code>docs/</code> files; fix broken links.</li>\n  <li><strong>Customer Portal:</strong> Optional live chat integration, KB search enhancements.</li>\n  <li><strong>ACS:</strong> Optional alert email/SMS integration; device grouping/tags.</li>\n</ol>\n\n<h2>Key Docs in Repository</h2>\n<p>In the repo <code>docs/</code> folder: <strong>docs/README.md</strong>, <strong>WHERE_WE_ARE_AND_NEXT_STEPS.md</strong>, <strong>NEXT_ITEMS_TO_ADD.md</strong>, and related planning files.</p>\n  </div>\n  <p><a href="/docs">← Documentation home</a></p>\n</article>';

export const M0_HELP_OVERVIEW_HTML =
  '<svelte:head>\n  <title>Help – WISP Management</title>\n</svelte:head>\n\n<div class="help-container">\n  <h1>WISP Management Help</h1>\n  <p class="lead">Complete guide to using the platform. Module-specific interactive help remains on the full app until CWL UI surfaces ship.</p>\n  <p><a href="/docs">Reference &amp; Project Status → /docs</a></p>\n  <section>\n    <h2>Quick topics</h2>\n    <ul>\n      <li><a href="/docs/getting-started">Getting Started</a></li>\n      <li><a href="/docs/deployment">Using WISP Management</a></li>\n      <li><a href="/docs/reference/project-status">Project Status &amp; Next Steps</a></li>\n      <li><a href="/wizards">Wizards</a> – guided flows (requires interactive UI sidecar)</li>\n      <li><a href="/dashboard">Dashboard</a> – CWL Data shell with tenant load (M1)</li>\n    </ul>\n  </section>\n  <section>\n    <h2>What is WISP Multitool?</h2>\n    <p>All-in-one platform for wireless ISPs: network planning, field operations, customer support, device management (ACS/TR-069), HSS subscribers, and team management.</p>\n  </section>\n</div>';

/** Patch routes.cwl in place for M0 surfaces. */
export function applyM0SurfacesToRoutesCwl() {
  if (!existsSync(routesPath)) return { ok: false, skip: "missing-routes-cwl" };
  let text = readFileSync(routesPath, "utf8");

  const projectStatusBlock = `@page GET "/docs/reference/project-status"
page docs_reference_project_status_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  ${cwlHtmlReturn(M0_PROJECT_STATUS_HTML)}
}`;

  let r = replaceRouteHandlerBlock(text, [
    '@route GET "/docs/reference/project-status"',
    '@page GET "/docs/reference/project-status"',
  ], projectStatusBlock);
  if (!r.ok) return r;
  text = r.text;

  const helpBlock = `@page GET "/help"
page help_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  ${cwlHtmlReturn(M0_HELP_OVERVIEW_HTML)}
}`;

  r = replaceRouteHandlerBlock(text, ['@route GET "/help"', '@page GET "/help"'], helpBlock);
  if (!r.ok) return r;
  text = r.text;

  if (text.includes('@route GET "/login"') && text.includes("hole hub-svelte:page-component")) {
    text = text.replace(
      /(@route GET "\/login"[\s\S]*?)hole hub-svelte:page-component;/,
      "$1hole hub-svelte:firebase-auth;",
    );
  }

  const verified =
    text.includes('@page GET "/docs/reference/project-status"') &&
    text.includes('@page GET "/help"') &&
    text.includes("hole hub-svelte:firebase-auth");
  if (!verified) return { ok: false, skip: "m0-routes-not-applied" };

  writeFileSync(routesPath, text, "utf8");
  return { ok: true, routesPath };
}

/** Sync cwl-preview.json hole flags for M0 routes. */
export function applyM0SurfacesToPreview() {
  if (!existsSync(previewPath)) return { ok: false, skip: "missing-cwl-preview" };
  const json = JSON.parse(readFileSync(previewPath, "utf8"));
  const routes = json.routes ?? [];
  for (const r of routes) {
    if (r.path === "/docs/reference/project-status" || r.path === "/help") {
      r.hole = false;
      r.holeReason = null;
      r.kind = "page";
    }
    if (r.path === "/login") {
      r.hole = true;
      r.holeReason = "hub-svelte:firebase-auth";
    }
  }
  json.generatedAt = new Date().toISOString();
  writeFileSync(previewPath, `${JSON.stringify(json, null, 2)}\n`, "utf8");
  return { ok: true, previewPath, routeCount: routes.length };
}

/** Publish M0 surface manifest. */
export function buildM0SurfaceManifest() {
  const text = existsSync(routesPath) ? readFileSync(routesPath, "utf8") : "";
  const docsPages = (text.match(/^@page GET "\/docs/gm) ?? []).length;
  const helpNative = text.includes('@page GET "/help"');
  const loginFirebaseHole =
    text.includes('@route GET "/login"') && text.includes("hole hub-svelte:firebase-auth");
  const projectStatusNative = text.includes('@page GET "/docs/reference/project-status"');
  const manifest = {
    kind: WISP_M0_SURFACE_MANIFEST_KIND,
    schemaVersion: WISP_M0_SURFACE_MANIFEST_SCHEMA_VERSION,
    ok: docsPages >= 5 && helpNative && loginFirebaseHole && projectStatusNative,
    wave: "M0",
    surfaces: {
      pages: ["/docs", "/docs/deployment", "/docs/getting-started", "/docs/reference", "/docs/reference/project-status", "/help"],
      uiHoles: [{ path: "/login", reason: "hub-svelte:firebase-auth", rfc: "CWL-RFC-0012" }],
    },
    docsPageCount: docsPages,
    helpNative,
    loginFirebaseHole,
    projectStatusNative,
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { ...manifest, manifestPath };
}

/** @param {object} [opts] */
export function applyWispM0Surfaces(opts = {}) {
  const routes = opts.skipRoutes ? { ok: true, skip: "skip-routes" } : applyM0SurfacesToRoutesCwl();
  const preview = opts.skipPreview ? { ok: true, skip: "skip-preview" } : applyM0SurfacesToPreview();
  const manifest = buildM0SurfaceManifest();
  const ok = routes.ok === true && preview.ok === true && manifest.ok === true;
  return { ok, routes, preview, manifest };
}

async function main() {
  const r = applyWispM0Surfaces();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("wisp-cwl-apply-m0-surfaces")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
