/**
 * Vite + Vue scoped-CSS adapter (DESIGN D6365, G9301).
 */
import { join } from "node:path";
import type { UiFrameworkCssAdapter, UiRouteStyleSources } from "./ui-assets.js";
import { uiRoutePatternSource } from "./ui-route-patterns.js";
import {
  cleanupDescopedSelector,
  collectManifestCss,
  kebabCase,
  readViteManifest,
  type ViteManifestEntry,
} from "./ui-assets-vite-shared.js";

export { cleanupDescopedSelector } from "./ui-assets-vite-shared.js";

const VUE_SCOPE_ATTR = /\[(?:data-v-[a-z0-9]+)\]/gi;

/** De-scope a Vue scoped selector (exported for tests). */
export function descopeVueSelector(selector: string): string | null {
  if (!VUE_SCOPE_ATTR.test(selector)) {
    const deepOnly = selector.replace(/:deep\(([^)]+)\)/g, "$1").replace(/:slotted\(([^)]+)\)/g, "$1");
    return deepOnly === selector ? selector : cleanupDescopedSelector(deepOnly);
  }
  VUE_SCOPE_ATTR.lastIndex = 0;
  let stripped = selector
    .replace(VUE_SCOPE_ATTR, "")
    .replace(/:deep\(([^)]+)\)/g, "$1")
    .replace(/:slotted\(([^)]+)\)/g, "$1");
  return cleanupDescopedSelector(stripped);
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

/** Vite + Vue adapter. `buildRoot` is the app root; dist/ holds the manifest. */
export const viteVueCssAdapter: UiFrameworkCssAdapter = {
  name: "vite-vue",
  detect(buildRoot) {
    const manifest = readViteManifest(buildRoot);
    return Object.keys(manifest).some((k) => viteVueManifestKeyToRouteId(k) !== null);
  },
  routeStyleSources(buildRoot) {
    const manifest = readViteManifest(buildRoot);
    const routes: UiRouteStyleSources[] = [];
    for (const key of Object.keys(manifest).sort()) {
      const routeId = viteVueManifestKeyToRouteId(key);
      if (routeId === null) continue;
      const sheets = collectManifestCss(manifest, key);
      if (sheets.length === 0) continue;
      routes.push({ routeId, stylesheets: sheets });
    }
    return { routes, fallbackStylesheets: fallbackStylesheets(manifest) };
  },
  resolveStylesheet(buildRoot, stylesheet) {
    return join(buildRoot, "dist", stylesheet);
  },
  descopeSelector: descopeVueSelector,
  routePatternSource: uiRoutePatternSource,
};
