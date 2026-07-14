/**
 * Vite + Vue scoped-CSS adapter (DESIGN D6365, G9301; SFC source depth G9929 / D6421;
 * Nuxt/layout sheets G9942 / D6427).
 * Prefers Vite build manifest; falls back to extracting `<style>` from `.vue` SFCs.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import type { UiFrameworkCssAdapter, UiRouteStyleSources } from "./ui-assets.js";
import { uiRoutePatternSource } from "./ui-route-patterns.js";
import {
  cleanupDescopedSelector,
  collectManifestCss,
  kebabCase,
  readViteManifest,
  type ViteManifestEntry,
} from "./ui-assets-vite-shared.js";
import { vueSourceFileToRouteId } from "./ui-markup-vue.js";

export { cleanupDescopedSelector } from "./ui-assets-vite-shared.js";

const VUE_SCOPE_ATTR = /\[(?:data-v-[a-z0-9]+)\]/gi;

/**
 * De-scope a Vue scoped selector (compiled `[data-v-*]` or SFC source deep/global).
 * Exported for tests.
 */
export function descopeVueSelector(selector: string): string | null {
  let stripped = selector
    .replace(/:deep\(([^)]+)\)/g, "$1")
    .replace(/:slotted\(([^)]+)\)/g, "$1")
    .replace(/:global\(([^)]+)\)/g, "$1")
    .replace(/::v-deep\(([^)]+)\)/g, "$1")
    .replace(/(?:::v-deep|\/deep\/|>>>)\s+/g, " ");

  if (VUE_SCOPE_ATTR.test(stripped)) {
    VUE_SCOPE_ATTR.lastIndex = 0;
    stripped = stripped.replace(VUE_SCOPE_ATTR, "");
  } else {
    VUE_SCOPE_ATTR.lastIndex = 0;
  }
  return cleanupDescopedSelector(stripped);
}

/** Extract concatenated CSS from Vue SFC `<style>` blocks (G9929). */
export function extractVueSfcStyleCss(source: string): string | null {
  const parts: string[] = [];
  const re = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const css = (m[1] ?? "").trim();
    if (css.length > 0) parts.push(css);
  }
  if (parts.length === 0) return null;
  return parts.join("\n");
}

/** Manifest key src/views/login.vue -> route id /login. */
export function viteVueManifestKeyToRouteId(key: string): string | null {
  const m = /^src\/(?:views|pages)\/(.+)\.vue$/i.exec(key);
  if (m === null || m[1] === undefined) return null;
  let path = m[1].replace(/\\/g, "/");
  if (/^(index|home)$/i.test(path)) return "/";
  path = path.replace(/\/index$/i, "");
  if (path.length === 0) return "/";
  const parts = path.split("/").map((seg) => kebabCase(seg.replace(/\.vue$/i, "")));
  return `/${parts.join("/")}`;
}

function discoverVuePageFiles(buildRoot: string): string[] {
  const roots = ["src/views", "src/pages", "pages"].map((d) => join(buildRoot, d));
  const files: string[] = [];
  function walk(dir: string, depth: number): void {
    if (depth > 12 || !existsSync(dir)) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const p = join(dir, ent.name);
      if (ent.isDirectory()) walk(p, depth + 1);
      else if (ent.name.endsWith(".vue")) files.push(p);
    }
  }
  for (const root of roots) walk(root, 0);
  return files.sort();
}

function vueSfcHasStyle(absPath: string): boolean {
  try {
    return extractVueSfcStyleCss(readFileSync(absPath, "utf8")) !== null;
  } catch {
    return false;
  }
}

function pushUnique(sheets: string[], rel: string): void {
  if (!sheets.includes(rel)) sheets.push(rel);
}

/** Nuxt / Vue layout name from page SFC (`definePageMeta` / `layout:`). */
export function parseVuePageLayoutName(source: string): string | null {
  const meta =
    /definePageMeta\s*\(\s*\{[\s\S]*?\blayout\s*:\s*['"]([^'"]+)['"]/.exec(source) ??
    /definePageMeta\s*\(\s*\{[\s\S]*?\blayout\s*:\s*false/.exec(source);
  if (meta) {
    if (meta[0].includes("layout: false") || meta[0].includes("layout : false")) return null;
    return meta[1] ?? null;
  }
  const legacy = /\blayout\s*:\s*['"]([^'"]+)['"]/.exec(source);
  return legacy?.[1] ?? null;
}

function resolveLayoutFile(buildRoot: string, layoutName: string): string | null {
  const candidates = [
    join(buildRoot, "src", "layouts", `${layoutName}.vue`),
    join(buildRoot, "layouts", `${layoutName}.vue`),
    join(buildRoot, "app", "layouts", `${layoutName}.vue`),
  ];
  for (const abs of candidates) {
    if (existsSync(abs) && vueSfcHasStyle(abs)) return abs;
  }
  return null;
}

/**
 * Collect Vue/Nuxt layout SFC stylesheets for a page (G9942).
 * Uses `definePageMeta({ layout })` when present; otherwise `default` when it exists.
 * `layout: false` → no layout sheets.
 */
export function collectVueLayoutStylesheets(buildRoot: string, pageAbs: string): string[] {
  const sheets: string[] = [];
  let source = "";
  try {
    source = readFileSync(pageAbs, "utf8");
  } catch {
    return sheets;
  }

  if (/\blayout\s*:\s*false\b/.test(source) && /definePageMeta/.test(source)) {
    return sheets;
  }

  const named = parseVuePageLayoutName(source);
  const layoutName = named ?? "default";
  const layoutAbs = resolveLayoutFile(buildRoot, layoutName);
  if (layoutAbs) {
    pushUnique(sheets, relative(buildRoot, layoutAbs).replace(/\\/g, "/"));
  }

  // Nuxt/SPA app shell (G9946) — when a layout is attached (not layout:false).
  if (layoutAbs || named === null) {
    for (const rel of ["src/App.vue", "app.vue", "app/app.vue"]) {
      const abs = join(buildRoot, rel);
      if (!existsSync(abs) || !vueSfcHasStyle(abs)) continue;
      // Windows is case-insensitive — only one shell path.
      const already = sheets.some(
        (s) => s.replace(/\\/g, "/").toLowerCase() === rel.toLowerCase(),
      );
      if (already) continue;
      pushUnique(sheets, rel);
    }
  }
  return sheets;
}

function fallbackStylesheets(manifest: Record<string, ViteManifestEntry>): string[] {
  const keys = ["index.html", "src/App.vue", "src/app/App.vue", "src/layouts/default.vue"];
  const sheets: string[] = [];
  for (const key of keys) {
    for (const s of collectManifestCss(manifest, key)) {
      if (!sheets.includes(s)) sheets.push(s);
    }
  }
  return sheets;
}

function manifestRouteSources(buildRoot: string): {
  routes: UiRouteStyleSources[];
  fallbackStylesheets: string[];
} | null {
  const manifest = readViteManifest(buildRoot);
  const routes: UiRouteStyleSources[] = [];
  for (const key of Object.keys(manifest).sort()) {
    const routeId = viteVueManifestKeyToRouteId(key);
    if (routeId === null) continue;
    const sheets = collectManifestCss(manifest, key);
    if (sheets.length === 0) continue;
    routes.push({ routeId, stylesheets: sheets });
  }
  if (routes.length === 0) return null;
  return { routes, fallbackStylesheets: fallbackStylesheets(manifest) };
}

function sfcRouteSources(buildRoot: string): {
  routes: UiRouteStyleSources[];
  fallbackStylesheets: string[];
} {
  const routes: UiRouteStyleSources[] = [];
  const attributed = new Set<string>();
  for (const abs of discoverVuePageFiles(buildRoot)) {
    const rel = relative(buildRoot, abs).replace(/\\/g, "/");
    const routeId = vueSourceFileToRouteId(rel);
    if (routeId === null) continue;
    const sheets = collectVueLayoutStylesheets(buildRoot, abs);
    if (vueSfcHasStyle(abs)) sheets.push(rel);
    if (sheets.length === 0) continue;
    for (const s of sheets) attributed.add(s);
    routes.push({ routeId, stylesheets: sheets });
  }
  // Orphan default layout only if never attributed.
  const orphan: string[] = [];
  for (const name of ["default"]) {
    const abs = resolveLayoutFile(buildRoot, name);
    if (!abs) continue;
    const rel = relative(buildRoot, abs).replace(/\\/g, "/");
    if (!attributed.has(rel)) orphan.push(rel);
  }
  return { routes, fallbackStylesheets: orphan };
}

/** Vite + Vue adapter. Manifest preferred; SFC `<style>` fallback when no dist. */
export const viteVueCssAdapter: UiFrameworkCssAdapter = {
  name: "vite-vue",
  detect(buildRoot) {
    if (manifestRouteSources(buildRoot) !== null) return true;
    return (
      discoverVuePageFiles(buildRoot).some((p) => vueSfcHasStyle(p)) ||
      resolveLayoutFile(buildRoot, "default") !== null
    );
  },
  routeStyleSources(buildRoot) {
    return manifestRouteSources(buildRoot) ?? sfcRouteSources(buildRoot);
  },
  resolveStylesheet(buildRoot, stylesheet) {
    if (stylesheet.replace(/\\/g, "/").endsWith(".vue")) {
      return join(buildRoot, stylesheet);
    }
    return join(buildRoot, "dist", stylesheet);
  },
  readStylesheetContent(_buildRoot, stylesheet, absPath) {
    if (!stylesheet.replace(/\\/g, "/").endsWith(".vue")) {
      return readFileSync(absPath, "utf8");
    }
    return extractVueSfcStyleCss(readFileSync(absPath, "utf8"));
  },
  descopeSelector: descopeVueSelector,
  routePatternSource: uiRoutePatternSource,
};
