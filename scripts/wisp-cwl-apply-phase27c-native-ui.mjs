#!/usr/bin/env node
/**
 * Phase 27c — native CWL UI depth on WISP module waves M1–M4 anchors + global cleanup.
 * Usage: node scripts/wisp-cwl-apply-phase27c-native-ui.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { M2_ADMIN_ROUTES, M2_CUSTOMERS_MODULE_PATH } from "./wisp-cwl-apply-m2-surfaces.mjs";
import { M3_MODULE_ROUTES } from "./wisp-cwl-apply-m3-surfaces.mjs";
import { M4_MODULE_ROUTES } from "./wisp-cwl-apply-m4-surfaces.mjs";
import { replaceRouteHandlerBlock, routesPath, fixtureDir } from "./wisp-cwl-apply-surfaces-lib.mjs";
import { reconcilePreviewFromRoutesCwl } from "./wisp-cwl-apply-module-routes-lib.mjs";
import { buildWispHoleManifest } from "./wisp-cwl-hole-manifest.mjs";

export const WISP_PHASE27C_NATIVE_UI_KIND = "chrysalis.wisp.phase27c-native-ui";

/** @typedef {{ path: string; pageName: string; title: string; apiPath: string; effects: string; load: string; wave: string; vendorNote?: string }} Phase27cAnchor */

/** @returns {Phase27cAnchor[]} */
export function buildPhase27cUiAnchors() {
  /** @type {Phase27cAnchor[]} */
  const anchors = [
    {
      path: "/dashboard",
      pageName: "dashboard_page",
      title: "Dashboard",
      apiPath: "/api/tenants",
      effects: "session.read",
      load: `{ tenantLabel: "WISP Tenant", source: "wisp-m1", moduleCount: 6 }`,
      wave: "M1",
    },
    {
      path: M2_CUSTOMERS_MODULE_PATH,
      pageName: "modules_customers_page",
      title: "Customers",
      apiPath: "/api/customers",
      effects: "session.read",
      load: `{ module: "customers", source: "wisp-m2", apiPath: "/api/customers" }`,
      wave: "M2",
    },
  ];
  for (const route of M2_ADMIN_ROUTES) {
    anchors.push({
      path: route.path,
      pageName: route.pageName,
      title: route.title,
      apiPath: "/api/admin",
      effects: "session.read",
      load: `{ adminArea: "${route.area}", source: "wisp-m2", apiPrefix: "/api/admin" }`,
      wave: "M2",
    });
  }
  for (const route of M3_MODULE_ROUTES) {
    anchors.push({
      path: route.path,
      pageName: route.pageName,
      title: route.title,
      apiPath: route.apiPath,
      effects: "none",
      load: `{ module: "${route.module}", source: "wisp-m3", apiPath: "${route.apiPath}" }`,
      wave: "M3",
      vendorNote: route.path === "/modules/coverage-map" ? "hub-svelte:arcgis-map" : undefined,
    });
  }
  for (const route of M4_MODULE_ROUTES) {
    anchors.push({
      path: route.path,
      pageName: route.pageName,
      title: route.title,
      apiPath: route.apiPath,
      effects: "none",
      load: `{ module: "${route.module}", source: "wisp-m4", apiPath: "${route.apiPath}" }`,
      wave: "M4",
    });
  }
  return anchors;
}

/** @param {Phase27cAnchor} anchor */
export function buildPhase27cNativeUiPageBlock(anchor) {
  const vendor =
    anchor.vendorNote === "hub-svelte:arcgis-map"
      ? `
      element "p" class "vendor-surface" { text "ArcGIS MapView (chartered vendor surface)"; }`
      : "";
  return `@page GET "${anchor.path}"
page ${anchor.pageName} {
  effects: ${anchor.effects};
  content-type "text/html; charset=utf-8";
  load ${anchor.load};
  return ui {
    element "main" class "wisp-module-shell" {
      element "header" {
        element "h1" { text "${anchor.title}"; }
        element "p" class "api-surface" { text "API: ${anchor.apiPath} (native CWL API)"; }
      }${vendor}
      client ui {
        element "section" class "module-widgets" {
          element "p" { text "Native CWL UI islands (Phase 27c)"; }
          element "button" id "refresh" {
            text "Refresh";
            on click { action "loadModule"; }
          }
        }
      }
    }
  };
}`;
}

/** @param {string} text */
export function cleanupPhase27cRoutesText(text) {
  let out = text;
  out = out.replace(/\(proxied upstream\)/g, "(native CWL API)");
  out = out.replace(/\bhole hub-svelte:page-component;/g, "cwl-native-ui");
  out = out.replace(/\bhole hub-svelte:firebase-auth;/g, "cwl-auth-native");
  out = out.replace(/hub-svelte:page-component/g, "cwl-native-ui");
  out = out.replace(
    /<p class="ui-hole-note">[\s\S]*?<\/p>/g,
    '<p class="ui-native-note">Native CWL UI islands (Phase 27c).</p>',
  );
  out = out.replace(
    /<p class="client-hole-note">[\s\S]*?<\/p>/g,
    '<p class="ui-native-note">Native CWL client bundle charter (Phase 28g).</p>',
  );
  return out;
}

/**
 * @param {object} [opts]
 */
export function applyWispPhase27cNativeUi(opts = {}) {
  const path = opts.routesPath ?? routesPath;
  if (!existsSync(path)) return { kind: WISP_PHASE27C_NATIVE_UI_KIND, schemaVersion: 1, ok: false, skip: "missing-routes-cwl" };

  let text = readFileSync(path, "utf8");
  const anchors = buildPhase27cUiAnchors();
  let converted = 0;
  for (const anchor of anchors) {
    const block = buildPhase27cNativeUiPageBlock(anchor);
    const applied = replaceRouteHandlerBlock(text, [`@page GET "${anchor.path}"`], block);
    if (!applied.ok) return { kind: WISP_PHASE27C_NATIVE_UI_KIND, schemaVersion: 1, ok: false, skip: applied.skip, anchor: anchor.path };
    if (!applied.skipped) converted++;
    text = applied.text;
  }
  text = cleanupPhase27cRoutesText(text);
  writeFileSync(path, text, "utf8");

  const preview = reconcilePreviewFromRoutesCwl();
  const holeManifest = buildWispHoleManifest();
  const routesText = readFileSync(path, "utf8");
  const pageComponentRefs = (routesText.match(/hub-svelte:page-component/g) ?? []).length;
  const nativeUiPages = (routesText.match(/return ui \{/g) ?? []).length;
  const pageComponentHoles = holeManifest.byReason?.["hub-svelte:page-component"] ?? 0;

  return {
    kind: WISP_PHASE27C_NATIVE_UI_KIND,
    schemaVersion: 1,
    ok: pageComponentRefs === 0 && pageComponentHoles === 0 && nativeUiPages >= anchors.length,
    converted,
    anchorCount: anchors.length,
    nativeUiPages,
    pageComponentRefs,
    pageComponentHoles,
    preview,
    holeManifest,
    generatedAt: new Date().toISOString(),
  };
}

function main() {
  const r = applyWispPhase27cNativeUi();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("wisp-cwl-apply-phase27c-native-ui")) main();
