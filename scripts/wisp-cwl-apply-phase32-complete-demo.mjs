#!/usr/bin/env node
/**
 * Phase 32 — complete WISP module demo surfaces (replace empty shells with interactive demo HTML).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { applyWispPhase30UiParity } from "./wisp-cwl-apply-phase30-ui-parity.mjs";
import { applyWispPhase30bModuleParity } from "./wisp-cwl-apply-phase30b-module-parity.mjs";
import {
  extractRouteBlock,
  listGetUiPaths,
} from "./wisp-cwl-bulk-lift-lib.mjs";
import { replaceRouteHandlerBlock, routesPath, fixtureDir } from "./wisp-cwl-apply-surfaces-lib.mjs";
import { reconcilePreviewFromRoutesCwl } from "./wisp-cwl-apply-module-routes-lib.mjs";
import { buildWispHoleManifest } from "./wisp-cwl-hole-manifest.mjs";
import { buildWispUiParityManifest, scanWispRoutesForForbiddenStubs } from "./wisp-cwl-ui-parity-verify.mjs";
import { buildWispModuleHtmlPageBlock } from "./wisp-cwl-ui-parity-lib.mjs";
import {
  buildWispModuleDemoHtml,
  buildWispMonitorRedirectDemoHtml,
  routeBlockNeedsModuleDemo,
  WISP_MODULE_DEMO_SKIP_PATHS,
  ensureWispModuleAddRoutes,
  collectMissingModuleAddPaths,
  ensureWispPocApiStubs,
  inferWispModuleApiPath,
  ensureWispDemoLoadApiPaths,
} from "./wisp-cwl-module-demo-lib.mjs";

const apiProxyPath = join(fixtureDir, "api-proxy.cwl");

export const WISP_PHASE32_COMPLETE_DEMO_KIND = "chrysalis.wisp.phase32-complete-demo";

/** @param {object} [opts] */
export function applyWispPhase32CompleteDemo(opts = {}) {
  const path = opts.routesPath ?? routesPath;
  if (!existsSync(path)) {
    return { kind: WISP_PHASE32_COMPLETE_DEMO_KIND, schemaVersion: 1, ok: false, skip: "missing-routes-cwl" };
  }

  const phase30 = applyWispPhase30UiParity({ routesPath: path });
  const phase30b = applyWispPhase30bModuleParity({ routesPath: path });

  let text = readFileSync(path, "utf8");
  const paths = listGetUiPaths(text);
  let applied = 0;
  let skipped = 0;

  for (const httpPath of paths) {
    if (WISP_MODULE_DEMO_SKIP_PATHS.has(httpPath)) {
      skipped++;
      continue;
    }
    const routeBlock = extractRouteBlock(text, httpPath);
    if (!routeBlockNeedsModuleDemo(routeBlock, httpPath)) {
      skipped++;
      continue;
    }
    const pageName = `${httpPath.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+/, "") || "root"}_page`;
    const html =
      httpPath === "/modules/monitor" ? buildWispMonitorRedirectDemoHtml(httpPath) : buildWispModuleDemoHtml(httpPath);
    const apiPath = inferWispModuleApiPath(httpPath);
    const loadMeta = apiPath
      ? `{ source: "wisp-m32", path: "${httpPath}", apiPath: "${apiPath}" }`
      : `{ source: "wisp-m32", path: "${httpPath}" }`;
    const pageBlock = buildWispModuleHtmlPageBlock(httpPath, pageName, html, loadMeta);
    const result = replaceRouteHandlerBlock(text, [`@page GET "${httpPath}"`, `@route GET "${httpPath}"`], pageBlock);
    if (!result.ok) {
      return { kind: WISP_PHASE32_COMPLETE_DEMO_KIND, schemaVersion: 1, ok: false, skip: result.skip, path: httpPath };
    }
    text = result.text;
    applied++;
  }

  const addRoutes = ensureWispModuleAddRoutes(text);
  text = addRoutes.text;
  text = ensureWispDemoLoadApiPaths(text);

  writeFileSync(path, text, "utf8");

  let apiPatched = false;
  if (existsSync(apiProxyPath)) {
    const apiText = readFileSync(apiProxyPath, "utf8");
    const apiStubs = ensureWispPocApiStubs(apiText);
    if (apiStubs.ok === true && apiStubs.patched === true) {
      writeFileSync(apiProxyPath, apiStubs.text, "utf8");
      apiPatched = true;
    }
  }

  const preview = reconcilePreviewFromRoutesCwl();
  const holeManifest = buildWispHoleManifest();
  const stubScan = scanWispRoutesForForbiddenStubs({ routesPath: path });
  const manifest = buildWispUiParityManifest({ routesPath: path });
  const demoCount = (text.match(/\bwisp-demo-content\b/g) ?? []).length;
  const emptyShellCount = (text.match(/<main class="wisp-surface-body"><\/main>/g) ?? []).length;
  const addMissing = collectMissingModuleAddPaths(text);

  return {
    kind: WISP_PHASE32_COMPLETE_DEMO_KIND,
    schemaVersion: 1,
    ok:
      emptyShellCount === 0 &&
      stubScan.ok === true &&
      demoCount >= 50 &&
      addMissing.length === 0,
    applied,
    skipped,
    addRoutes: addRoutes.addRouteCount,
    addMissingCount: addMissing.length,
    apiPatched,
    demoCount,
    emptyShellCount,
    stubScan,
    manifest,
    phase30,
    phase30b,
    preview,
    holeManifest,
    generatedAt: new Date().toISOString(),
  };
}

function main() {
  const r = applyWispPhase32CompleteDemo();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("wisp-cwl-apply-phase32-complete-demo")) {
  main();
}
