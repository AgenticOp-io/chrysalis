#!/usr/bin/env node
/**
 * Phase 30 — WISP CWL UI parity (login + dashboard lifted from Module_Manager POC).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { replaceRouteHandlerBlock, routesPath } from "./wisp-cwl-apply-surfaces-lib.mjs";
import { reconcilePreviewFromRoutesCwl } from "./wisp-cwl-apply-module-routes-lib.mjs";
import { buildWispHoleManifest } from "./wisp-cwl-hole-manifest.mjs";
import {
  WISP_UI_PARITY_KIND,
  buildWispLoginParityHtml,
  buildWispDashboardParityHtml,
  buildWispModulesIndexHtml,
  buildWispLoginPageBlock,
  buildWispDashboardPageBlock,
  buildWispModulesPageBlock,
} from "./wisp-cwl-ui-parity-lib.mjs";

export const WISP_PHASE30_UI_PARITY_KIND = WISP_UI_PARITY_KIND;

/** @param {object} [opts] */
export function applyWispPhase30UiParity(opts = {}) {
  const path = opts.routesPath ?? routesPath;
  if (!existsSync(path)) {
    return { kind: WISP_PHASE30_UI_PARITY_KIND, schemaVersion: 1, ok: false, skip: "missing-routes-cwl" };
  }

  let text = readFileSync(path, "utf8");
  const loginHtml = buildWispLoginParityHtml();
  const dashboardHtml = buildWispDashboardParityHtml();

  const loginApplied = replaceRouteHandlerBlock(
    text,
    [`@page GET "/login"`, `@route GET "/login"`],
    buildWispLoginPageBlock(loginHtml),
  );
  if (!loginApplied.ok) {
    return { kind: WISP_PHASE30_UI_PARITY_KIND, schemaVersion: 1, ok: false, skip: loginApplied.skip };
  }
  text = loginApplied.text;

  const dashApplied = replaceRouteHandlerBlock(
    text,
    [`@page GET "/dashboard"`, `@route GET "/dashboard"`],
    buildWispDashboardPageBlock(dashboardHtml),
  );
  if (!dashApplied.ok) {
    return { kind: WISP_PHASE30_UI_PARITY_KIND, schemaVersion: 1, ok: false, skip: dashApplied.skip };
  }
  text = dashApplied.text;

  const modulesApplied = replaceRouteHandlerBlock(
    text,
    [`@page GET "/modules"`, `@route GET "/modules"`],
    buildWispModulesPageBlock(buildWispModulesIndexHtml()),
  );
  if (modulesApplied.ok) text = modulesApplied.text;

  writeFileSync(path, text, "utf8");

  const preview = reconcilePreviewFromRoutesCwl();
  const holeManifest = buildWispHoleManifest();
  const routesText = readFileSync(path, "utf8");
  const loginOk =
    routesText.includes("login-page") &&
    routesText.includes("wisptools-logo.svg") &&
    routesText.includes("demo@wisptools.io");
  const dashboardOk =
    routesText.includes("dashboard-container") &&
    routesText.includes("modules-grid") &&
    routesText.includes("coverage-map");
  const modulesOk =
    routesText.includes("wisp-modules-index") || routesText.includes('data-wisp-page=\\"modules\\"');

  return {
    kind: WISP_PHASE30_UI_PARITY_KIND,
    schemaVersion: 1,
    ok: loginOk && dashboardOk && modulesOk,
    loginOk,
    dashboardOk,
    modulesOk,
    preview,
    holeManifest,
    generatedAt: new Date().toISOString(),
  };
}

function main() {
  const r = applyWispPhase30UiParity();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("wisp-cwl-apply-phase30-ui-parity")) main();
