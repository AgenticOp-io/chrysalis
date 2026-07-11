/**
 * Vite + CSS Modules adapter (DESIGN D6365, G9303).
 *
 * Uses the Vite client manifest (same as vite-vue) but matches page entries
 * as src/pages/*.tsx|jsx and de-scopes hashed module class tokens instead of
 * Vue data-v attributes. Requires .module.css in the manifest graph so plain
 * Vite SPAs without CSS Modules do not match this adapter.
 */
import { join } from "node:path";
import type { UiFrameworkCssAdapter, UiRouteStyleSources } from "./ui-assets.js";
import { uiRoutePatternSource } from "./ui-route-patterns.js";
import {
  cleanupDescopedSelector,
  collectManifestCss,
  kebabCase,
  manifestHasCssModuleSheets,
  readViteManifest,
  type ViteManifestEntry,
} from "./ui-assets-vite-shared.js";

/** Manifest key src/pages/login.tsx -> route id /login. */
export function viteJsManifestKeyToRouteId(key: string): string | null {
  const m = /^src\/(?:pages|views)\/(.+)\.(?:tsx|jsx)$/i.exec(key);
  if (m === null || m[1] === undefined) return null;
  let path = m[1].replace(/\\/g, "/");
  if (/^(index|home)$/i.test(path)) return "/";
  path = path.replace(/\/index$/i, "");
  if (path.length === 0) return "/";
  const parts = path.split("/").map((seg) => kebabCase(seg));
  return `/${parts.join("/")}`;
}

/** De-scope CSS Modules hashed class tokens in one selector (exported for tests). */
export function descopeCssModuleSelector(selector: string): string | null {
  let stripped = selector
    // Vite css modules: ._login-page_a1b2c3
    .replace(/\._([a-zA-Z][a-zA-Z0-9_-]*)_[a-zA-Z0-9]{4,}/g, ".$1")
    // Webpack-style: .Login_login-page__hash
    .replace(/\.[A-Za-z0-9]+_([A-Za-z0-9-]+)__([A-Za-z0-9_-]+)/g, ".$1");
  return cleanupDescopedSelector(stripped);
}

function fallbackStylesheets(manifest: Record<string, ViteManifestEntry>): string[] {
  const keys = ["index.html", "src/App.tsx", "src/app/App.tsx", "src/main.tsx", "src/index.tsx"];
  const sheets: string[] = [];
  for (const key of keys) {
    for (const s of collectManifestCss(manifest, key)) {
      if (!sheets.includes(s)) sheets.push(s);
    }
  }
  return sheets;
}

/** Vite + CSS Modules adapter. */
export const viteCssModulesAdapter: UiFrameworkCssAdapter = {
  name: "vite-css-modules",
  detect(buildRoot) {
    const manifest = readViteManifest(buildRoot);
    if (!manifestHasCssModuleSheets(manifest)) return false;
    return Object.keys(manifest).some((k) => viteJsManifestKeyToRouteId(k) !== null);
  },
  routeStyleSources(buildRoot) {
    const manifest = readViteManifest(buildRoot);
    const routes: UiRouteStyleSources[] = [];
    for (const key of Object.keys(manifest).sort()) {
      const routeId = viteJsManifestKeyToRouteId(key);
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
  descopeSelector: descopeCssModuleSelector,
  routePatternSource: uiRoutePatternSource,
};
