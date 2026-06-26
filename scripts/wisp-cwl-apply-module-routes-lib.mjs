/** Shared route-lift helpers for WISP Phase 13 M3–M5 module surfaces. */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import {
  cwlHtmlReturn,
  replaceRouteHandlerBlock,
  routesPath,
  previewPath,
} from "./wisp-cwl-apply-surfaces-lib.mjs";

/**
 * @typedef {object} LiftRouteSpec
 * @property {string} path
 * @property {string} pageName
 * @property {string} module
 * @property {string} title
 * @property {string} apiPath
 * @property {string} source
 * @property {string} [section]
 * @property {string} [extraNote]
 */

/** @param {LiftRouteSpec} route */
export function genericModuleShellHtml(route) {
  const sectionLine = route.section ? `\n  <p class="section">Section: ${route.section}</p>` : "";
  const note = route.extraNote ? `\n  <p class="extra-note">${route.extraNote}</p>` : "";
  return `<svelte:head>\n  <title>${route.title} – WISP Management</title>\n</svelte:head>\n\n<div class="module-shell">\n  <header>\n    <h1>${route.title}</h1>\n    <p class="api-surface">API: ${route.apiPath} (proxied upstream)</p>\n  </header>${sectionLine}${note}\n  <p class="ui-hole-note">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>`;
}

/** @param {LiftRouteSpec} route @param {string} [html] */
export function buildLoadPageBlock(route, html) {
  const body = html ?? genericModuleShellHtml(route);
  const loadParts = [
    `module: "${route.module}"`,
    route.section ? `section: "${route.section}"` : null,
    `source: "${route.source}"`,
    `apiPath: "${route.apiPath}"`,
  ].filter(Boolean);
  return `@page GET "${route.path}"
page ${route.pageName} {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { ${loadParts.join(", ")} };
  ${cwlHtmlReturn(body)}
}`;
}

/**
 * @param {string} text
 * @param {LiftRouteSpec[]} routes
 * @param {(route: LiftRouteSpec) => string} [buildBlock]
 */
export function applyLiftRoutesToCwl(text, routes, buildBlock = buildLoadPageBlock) {
  for (const route of routes) {
    const block = buildBlock(route);
    const r = replaceRouteHandlerBlock(
      text,
      [`@route GET "${route.path}"`, `@page GET "${route.path}"`],
      block,
    );
    if (!r.ok) return r;
    text = r.text;
  }
  return { text, ok: true, lifted: routes.length };
}

/** Sync cwl-preview.json hole flags from routes.cwl @page vs @route state. */
export function reconcilePreviewFromRoutesCwl() {
  if (!existsSync(previewPath) || !existsSync(routesPath)) return { ok: false, skip: "missing-preview-or-routes" };
  const text = readFileSync(routesPath, "utf8");
  const json = JSON.parse(readFileSync(previewPath, "utf8"));
  for (const r of json.routes ?? []) {
    if (r.path === "/login") {
      const isPage = text.includes('@page GET "/login"');
      const hasFirebaseHole = text.includes("hole hub-svelte:firebase-auth");
      r.hole = !isPage && hasFirebaseHole;
      r.holeReason = r.hole ? "hub-svelte:firebase-auth" : null;
      r.kind = isPage ? "page" : "route";
      continue;
    }
    if (text.includes(`@page GET "${r.path}"`)) {
      r.hole = false;
      r.holeReason = null;
      r.kind = "page";
      r.hasLoad = text.includes(`@page GET "${r.path}"`) && text.includes("load {");
    } else if (text.includes(`@route GET "${r.path}"`)) {
      r.hole = true;
      r.holeReason = r.holeReason ?? "hub-svelte:page-component";
      r.kind = "route";
    }
  }
  json.generatedAt = new Date().toISOString();
  writeFileSync(previewPath, `${JSON.stringify(json, null, 2)}\n`, "utf8");
  return { ok: true, previewPath };
}

/** @param {string[]} paths */
export function patchPreviewPaths(paths) {
  if (!existsSync(previewPath)) return { ok: false, skip: "missing-cwl-preview" };
  const json = JSON.parse(readFileSync(previewPath, "utf8"));
  const routes = json.routes ?? [];
  for (const r of routes) {
    if (paths.includes(r.path)) {
      r.hole = false;
      r.holeReason = null;
      r.kind = "page";
      r.hasLoad = true;
    }
  }
  json.generatedAt = new Date().toISOString();
  writeFileSync(previewPath, `${JSON.stringify(json, null, 2)}\n`, "utf8");
  return { ok: true, previewPath, liftedCount: paths.length };
}

/** @param {string} path */
export function apiPathForWispRoute(path) {
  if (path.includes("/customers/")) return "/api/customers";
  if (path.startsWith("/modules/inventory") || path === "/modules/hardware") return "/api/inventory";
  if (path.startsWith("/modules/work-orders")) return "/api/work-orders";
  if (path.startsWith("/modules/user-management")) return "/api/users";
  if (path.startsWith("/modules/tenant-management") || path.startsWith("/tenant-")) return "/api/tenants";
  if (path === "/modules/maintain" || path.startsWith("/modules/help-desk")) return "/api/maintain";
  if (path.startsWith("/modules/monitoring") || path === "/modules/monitor") return "/api/monitoring";
  if (path === "/modules/voice-telephony") return "/api/voice";
  if (path === "/modules/billing") return "/api/customer-billing";
  if (path === "/modules/pci-resolution" || path === "/modules/sites") return "/api/network";
  if (path === "/modules/cbrs-management") return "/api/epc-updates";
  if (path === "/modules/backend-management") return "/api/internal";
  if (path === "/wizards") return "/api/plans";
  if (path === "/settings/module-access") return "/api/permissions";
  if (path === "/support-dashboard") return "/api/maintain";
  return "/api/users";
}

/** @param {string} path */
export function moduleKeyFromPath(path) {
  if (path.startsWith("/modules/")) {
    return path.replace(/^\/modules\//, "").split("/")[0].replace(/-/g, "_");
  }
  return path.replace(/^\//, "").split("/")[0].replace(/-/g, "_");
}

/** @param {string} path */
export function sectionFromPath(path) {
  if (!path.startsWith("/modules/")) return "";
  const rest = path.replace(/^\/modules\//, "");
  const idx = rest.indexOf("/");
  return idx >= 0 ? rest.slice(idx + 1) : "";
}

/** @param {string} path */
export function titleFromPath(path) {
  const seg = path.split("/").filter(Boolean).pop() ?? "Page";
  if (seg.startsWith(":")) return "Detail";
  return seg
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Build lift specs from holed @route blocks in routes.cwl (source of truth). */
export function buildLiftSpecsFromRoutesCwl(source, opts = {}) {
  if (!existsSync(routesPath)) return [];
  const text = readFileSync(routesPath, "utf8");
  const skip = new Set(opts.skipPaths ?? ["/login"]);
  /** @type {import("./wisp-cwl-apply-module-routes-lib.mjs").LiftRouteSpec[]} */
  const specs = [];
  const re = /@route GET "([^"]+)"[\s\S]*?handler (\w+)[\s\S]*?hole hub-svelte:[^;]+;/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const path = m[1];
    if (skip.has(path)) continue;
    specs.push({
      path,
      pageName: m[2],
      module: moduleKeyFromPath(path),
      section: sectionFromPath(path),
      title: titleFromPath(path),
      apiPath: apiPathForWispRoute(path),
      source,
    });
  }
  return specs;
}

/** Count @route UI blocks that should be lifted (all except /login firebase hole). */
export function countStrayHoledRoutes(text) {
  const re = /@route GET "([^"]+)"[\s\S]*?hole hub-svelte:[^;]+;/g;
  let count = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m[1] !== "/login") count++;
  }
  return count;
}

/** Build lift specs from cwl-preview holed page-component routes. */
export function buildLiftSpecsFromPreview(source, opts = {}) {
  if (!existsSync(previewPath)) return [];
  const json = JSON.parse(readFileSync(previewPath, "utf8"));
  const skip = new Set(opts.skipPaths ?? ["/login"]);
  return (json.routes ?? [])
    .filter((r) => r.hole === true && r.holeReason === "hub-svelte:page-component" && !skip.has(r.path))
    .map((r) => ({
      path: r.path,
      pageName: r.handler ?? r.path.replace(/[^\w]+/g, "_"),
      module: moduleKeyFromPath(r.path),
      section: sectionFromPath(r.path),
      title: titleFromPath(r.path),
      apiPath: apiPathForWispRoute(r.path),
      source,
    }));
}

/** @param {LiftRouteSpec[]} routes */
export function writeRoutesCwlFromLift(text, routes) {
  const applied = applyLiftRoutesToCwl(text, routes);
  if (!applied.ok) return applied;
  writeFileSync(routesPath, applied.text, "utf8");
  return applied;
}
