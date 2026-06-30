#!/usr/bin/env node
/**
 * Phase 30b — map module UI parity (Plan iframe shell + Coverage Map ArcGIS host).
 * Runs after Phase 28g so integration stubs are replaced with POC layout.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { replaceRouteHandlerBlock, routesPath } from "./wisp-cwl-apply-surfaces-lib.mjs";
import { reconcilePreviewFromRoutesCwl } from "./wisp-cwl-apply-module-routes-lib.mjs";
import { buildWispHoleManifest } from "./wisp-cwl-hole-manifest.mjs";
import {
  WISP_UI_PARITY_KIND,
  wispPhase30bMapModuleRoutes,
  buildWispModuleHtmlPageBlock,
} from "./wisp-cwl-ui-parity-lib.mjs";

export const WISP_PHASE30B_MODULE_PARITY_KIND = `${WISP_UI_PARITY_KIND}.modules`;

/** @param {object} [opts] */
export function applyWispPhase30bModuleParity(opts = {}) {
  const path = opts.routesPath ?? routesPath;
  if (!existsSync(path)) {
    return { kind: WISP_PHASE30B_MODULE_PARITY_KIND, schemaVersion: 1, ok: false, skip: "missing-routes-cwl" };
  }

  let text = readFileSync(path, "utf8");
  const routes = wispPhase30bMapModuleRoutes();
  let converted = 0;
  for (const route of routes) {
    const block = buildWispModuleHtmlPageBlock(route.path, route.pageName, route.html, route.loadMeta);
    const applied = replaceRouteHandlerBlock(text, [`@page GET "${route.path}"`, `@route GET "${route.path}"`], block);
    if (!applied.ok) {
      return { kind: WISP_PHASE30B_MODULE_PARITY_KIND, schemaVersion: 1, ok: false, skip: applied.skip, path: route.path };
    }
    if (!applied.skipped) converted++;
    text = applied.text;
  }
  writeFileSync(path, text, "utf8");

  const preview = reconcilePreviewFromRoutesCwl();
  const holeManifest = buildWispHoleManifest();
  const routesText = readFileSync(path, "utf8");
  const planOk = routesText.includes("wisp-plan-app") && routesText.includes("wisp-header-overlay");
  const deployOk = routesText.includes("wisp-deploy-app") && routesText.includes("deploy-map-iframe");
  const mapOk = routesText.includes("arcgis-map-view") && routesText.includes("wisp-coverage-map");

  return {
    kind: WISP_PHASE30B_MODULE_PARITY_KIND,
    schemaVersion: 1,
    ok: planOk && deployOk && mapOk,
    converted,
    planOk,
    deployOk,
    mapOk,
    preview,
    holeManifest,
    generatedAt: new Date().toISOString(),
  };
}

function main() {
  const r = applyWispPhase30bModuleParity();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("wisp-cwl-apply-phase30b-module-parity")) main();
