#!/usr/bin/env node
/**
 * Phase 28g — integration vendor client UI depth (ArcGIS, ECharts, cross-frame charters).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { replaceRouteHandlerBlock, routesPath } from "./wisp-cwl-apply-surfaces-lib.mjs";
import { reconcilePreviewFromRoutesCwl } from "./wisp-cwl-apply-module-routes-lib.mjs";
import { buildWispHoleManifest } from "./wisp-cwl-hole-manifest.mjs";

export const WISP_PHASE28G_INTEGRATIONS_UI_KIND = "chrysalis.wisp.phase28g-integrations-ui";

/** @typedef {{ path: string; pageName: string; title: string; apiPath: string; vendor: string; clientBlock: string }} IntegrationAnchor */

/** @returns {IntegrationAnchor[]} */
export function buildPhase28gIntegrationAnchors() {
  return [
    {
      path: "/modules/coverage-map",
      pageName: "modules_coverage_map_page",
      title: "Coverage Map",
      apiPath: "/api/coverage",
      vendor: "hub-svelte:arcgis-map",
      clientBlock: `
        element "div" id "arcgis-map-host" class "wisp-vendor-surface" {
          element "p" { text "ArcGIS MapView host (Phase 28g — CWL client bundle charter)"; }
        }
        element "div" id "map-toolbar" class "wisp-vendor-controls" {
          element "button" id "zoom-in" { text "Zoom in"; on click { action "mapZoomIn"; } }
          element "button" id "zoom-out" { text "Zoom out"; on click { action "mapZoomOut"; } }
        }`,
    },
    {
      path: "/modules/plan",
      pageName: "modules_plan_page",
      title: "Plan",
      apiPath: "/api/plans",
      vendor: "hub-svelte:arcgis-map",
      clientBlock: `
        element "div" id "plan-map-host" class "wisp-vendor-surface" {
          element "p" { text "ArcGIS geocode + plan map (Phase 28g charter)"; }
        }`,
    },
    {
      path: "/modules/monitor",
      pageName: "modules_monitor_page",
      title: "Monitor",
      apiPath: "/api/monitoring",
      vendor: "hub-svelte:chart-component",
      clientBlock: `
        element "div" id "monitor-charts" class "wisp-vendor-surface" {
          element "p" { text "ECharts monitoring graphs (Phase 28g — CWL client bundle charter)"; }
        }
        element "canvas" id "monitor-chart-primary" { }`,
    },
    {
      path: "/modules/monitoring",
      pageName: "modules_monitoring_page",
      title: "Monitoring",
      apiPath: "/api/monitoring-graphs",
      vendor: "hub-svelte:chart-component",
      clientBlock: `
        element "div" id "monitoring-graphs" class "wisp-vendor-surface" {
          element "p" { text "SNMP / monitoring graph host (Phase 28g charter)"; }
        }`,
    },
  ];
}

/** @param {IntegrationAnchor} anchor */
export function buildPhase28gIntegrationPageBlock(anchor) {
  return `@page GET "${anchor.path}"
page ${anchor.pageName} {
  effects: session.read;
  content-type "text/html; charset=utf-8";
  load { module: "${anchor.path.split("/").pop()}", source: "wisp-28g", apiPath: "${anchor.apiPath}", vendor: "${anchor.vendor}" };
  return ui {
    element "main" class "wisp-module-shell wisp-integration-shell" {
      element "header" {
        element "h1" { text "${anchor.title}"; }
        element "p" class "vendor-charter" { text "Vendor: ${anchor.vendor} (chartered — browser SDK remains infra)"; }
        element "p" class "api-surface" { text "API: ${anchor.apiPath} (native CWL API)"; }
      }
      client ui {${anchor.clientBlock}
        element "section" class "module-widgets" {
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

/**
 * @param {object} [opts]
 */
export function applyWispPhase28gIntegrationsUi(opts = {}) {
  const path = opts.routesPath ?? routesPath;
  if (!existsSync(path)) {
    return { kind: WISP_PHASE28G_INTEGRATIONS_UI_KIND, schemaVersion: 1, ok: false, skip: "missing-routes-cwl" };
  }

  let text = readFileSync(path, "utf8");
  const anchors = buildPhase28gIntegrationAnchors();
  let converted = 0;
  for (const anchor of anchors) {
    const block = buildPhase28gIntegrationPageBlock(anchor);
    const applied = replaceRouteHandlerBlock(text, [`@page GET "${anchor.path}"`], block);
    if (!applied.ok) {
      return { kind: WISP_PHASE28G_INTEGRATIONS_UI_KIND, schemaVersion: 1, ok: false, skip: applied.skip, anchor: anchor.path };
    }
    if (!applied.skipped) converted++;
    text = applied.text;
  }
  writeFileSync(path, text, "utf8");

  reconcilePreviewFromRoutesCwl();
  const holeManifest = buildWispHoleManifest();
  const routesText = readFileSync(path, "utf8");
  const integrationMarkers = (routesText.match(/wisp-integration-shell/g) ?? []).length;

  return {
    kind: WISP_PHASE28G_INTEGRATIONS_UI_KIND,
    schemaVersion: 1,
    ok: integrationMarkers >= anchors.length,
    converted,
    anchorCount: anchors.length,
    integrationMarkers,
    holeManifest,
    generatedAt: new Date().toISOString(),
  };
}

function main() {
  const r = applyWispPhase28gIntegrationsUi();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("wisp-cwl-apply-phase28g-integrations-ui")) main();
