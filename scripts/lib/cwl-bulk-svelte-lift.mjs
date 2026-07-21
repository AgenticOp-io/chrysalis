/** Bulk SvelteKit → CWL @page lift helpers (Phase 31). */
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { liftStaticSveltePageHtml } from "../hub-ingest/sveltekit-route-lift.mjs";
import { replaceRouteHandlerBlock, routesPath } from "./cwl-apply-surfaces.mjs";
import {
  buildWispModuleHtmlPageBlock,
  htmlContainsForbiddenStub,
  WISP_FORBIDDEN_STUB_PATTERNS,
} from "../wisp-cwl-ui-parity-lib.mjs";
import { buildWispModuleDemoHtml } from "../wisp-cwl-module-demo-lib.mjs";

export const WISP_BULK_LIFT_KIND = "chrysalis.wisp.bulk-lift";

/** Routes with dedicated parity HTML (Phase 30/30b). */
export const WISP_BULK_LIFT_SKIP_PATHS = new Set([
  "/login",
  "/dashboard",
  "/modules/plan",
  "/modules/deploy",
  "/modules/coverage-map",
]);

const defaultWispRoot =
  process.env.CHRYSALIS_WISP_ROOT ??
  process.env.WISP_MODULE_DIR ??
  "C:/Users/david/Downloads/WISPTools/Module_Manager";

/** @param {string} httpPath */
export function titleFromHttpPath(httpPath) {
  const seg = httpPath.split("/").filter(Boolean).pop() ?? "Home";
  return seg
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** @param {string} wispRoot @param {string} httpPath */
export function sveltePagePathForRoute(wispRoot, httpPath) {
  const root = resolve(wispRoot);
  if (httpPath === "/") return join(root, "src/routes/+page.svelte");
  // CWL / corpus use `:id`; SvelteKit files use `[id]`.
  const rel = httpPath
    .replace(/^\//, "")
    .replace(/:([A-Za-z_][\w]*)/g, "[$1]");
  return join(root, "src/routes", rel, "+page.svelte");
}

/** @param {string} source */
export function listGetUiPaths(source) {
  /** @type {string[]} */
  const paths = [];
  for (const m of source.matchAll(/@(?:page|route)\s+GET\s+"([^"]+)"/g)) {
    const p = m[1];
    if (!p.startsWith("/api")) paths.push(p);
  }
  return [...new Set(paths)];
}

/** @param {string} text @param {string} httpPath */
export function extractRouteBlock(text, httpPath) {
  const markers = [`@page GET "${httpPath}"`, `@route GET "${httpPath}"`];
  let start = -1;
  for (const marker of markers) {
    start = text.indexOf(marker);
    if (start >= 0) break;
  }
  if (start < 0) return null;
  const brace = text.indexOf("{", start);
  if (brace < 0) return null;
  let depth = 0;
  for (let i = brace; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/** @param {string} block @param {RegExp[]} [patterns] */
export function routeBlockNeedsBulkLift(block, patterns = WISP_FORBIDDEN_STUB_PATTERNS) {
  if (!block) return false;
  const body = extractRouteResponseBody(block);
  if (htmlContainsForbiddenStub(body, patterns)) return true;
  if (/\bhole\s+hub-svelte:/.test(block)) return true;
  if (/\breturn\s+ui\s*\{/.test(block)) return true;
  if (!/\breturn\s+html\s+"/.test(block)) return true;
  return false;
}

import { unescapeCwlHtmlLiteral } from "./unescape-cwl-html.mjs";

/** @param {string} block */
function extractRouteResponseBody(block) {
  const htmlMatch = /return\s+html\s+("(?:\\.|[^"\\])*")/s.exec(block);
  if (htmlMatch) return unescapeCwlHtmlLiteral(htmlMatch[1]);
  const uiMatch = /return\s+ui\s*\{([\s\S]*)\}\s*;?\s*$/.exec(block);
  if (uiMatch) return uiMatch[1];
  return block;
}

/** @param {string} path @param {string} title */
export function buildWispGenericAppSurfaceHtml(path, title) {
  const safePath = path.replace(/"/g, "");
  const safeTitle = title.replace(/</g, "");
  return `<div class="wisp-app-surface" data-wisp-page="app" data-wisp-path="${safePath}" data-cwl-island="client">
  <nav class="wisp-surface-nav"><a href="/dashboard">Dashboard</a> · <a href="/help">Help</a></nav>
  <header class="wisp-surface-header"><h1>${safeTitle}</h1></header>
  <main class="wisp-surface-body"></main>
</div>`;
}

/**
 * @param {object} [opts]
 * @param {string} [opts.wispRoot]
 * @param {string} [opts.routesPath]
 * @param {Set<string>} [opts.skipPaths]
 */
export function applyWispBulkSvelteLift(opts = {}) {
  const wispRoot = resolve(opts.wispRoot ?? defaultWispRoot);
  const path = opts.routesPath ?? routesPath;
  const skip = opts.skipPaths ?? WISP_BULK_LIFT_SKIP_PATHS;
  if (!existsSync(path)) {
    return { kind: WISP_BULK_LIFT_KIND, schemaVersion: 1, ok: false, skip: "missing-routes-cwl" };
  }

  let text = readFileSync(path, "utf8");
  const paths = listGetUiPaths(text);
  let lifted = 0;
  let shelled = 0;
  let skipped = 0;
  let missingSvelte = 0;
  let unchanged = 0;

  for (const httpPath of paths) {
    if (skip.has(httpPath)) {
      skipped++;
      continue;
    }
    const routeBlock = extractRouteBlock(text, httpPath);
    if (!routeBlockNeedsBulkLift(routeBlock)) {
      unchanged++;
      continue;
    }
    const svelteFile = sveltePagePathForRoute(wispRoot, httpPath);
    const pageName = `${httpPath.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+/, "") || "root"}_page`;
    let html = null;
    if (existsSync(svelteFile)) {
      html = liftStaticSveltePageHtml(readFileSync(svelteFile, "utf8"));
    } else {
      missingSvelte++;
    }
    if (!html) {
      html = buildWispModuleDemoHtml(httpPath);
      shelled++;
    } else {
      lifted++;
    }
    const pageBlock = buildWispModuleHtmlPageBlock(
      httpPath,
      pageName,
      html,
      `{ source: "wisp-m31", path: "${httpPath}" }`,
    );
    const applied = replaceRouteHandlerBlock(text, [`@page GET "${httpPath}"`, `@route GET "${httpPath}"`], pageBlock);
    if (!applied.ok) {
      return { kind: WISP_BULK_LIFT_KIND, schemaVersion: 1, ok: false, skip: applied.skip, path: httpPath };
    }
    text = applied.text;
  }

  return {
    kind: WISP_BULK_LIFT_KIND,
    schemaVersion: 1,
    ok: true,
    routeCount: paths.length,
    lifted,
    shelled,
    skipped,
    missingSvelte,
    unchanged,
    text,
  };
}
