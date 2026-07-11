/**
 * Angular emulated encapsulation CSS adapter (DESIGN D6365, G9305).
 *
 * Angular 17+ application builder uses Vite internally; production output
 * places a Vite manifest under `dist/<project>/browser/`. Component entries
 * appear as `src/app/.../*.component.ts` keys with scoped CSS containing
 * `_ngcontent-*` / `_nghost-*` attribute selectors.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { UiFrameworkCssAdapter, UiRouteStyleSources } from "./ui-assets.js";
import { uiRoutePatternSource } from "./ui-route-patterns.js";
import {
  collectManifestCss,
  kebabCase,
  readViteManifest,
  type ViteManifestEntry,
} from "./ui-assets-vite-shared.js";

const NG_CONTENT = /\[_ngcontent-ng-[a-z0-9-]+\]/gi;
const NG_HOST = /\[_nghost-ng-[a-z0-9-]+\]/gi;

/** Strip Angular emulated encapsulation attribute selectors (exported for tests). */
export function descopeAngularSelector(selector: string): string | null {
  if (!NG_CONTENT.test(selector) && !NG_HOST.test(selector)) {
    return selector;
  }
  NG_CONTENT.lastIndex = 0;
  NG_HOST.lastIndex = 0;
  let stripped = selector.replace(NG_CONTENT, "").replace(NG_HOST, "");
  stripped = stripped
    .replace(/,\s*,/g, ",")
    .replace(/\(\s*,\s*/g, "(")
    .replace(/,\s*\)/g, ")")
    .replace(/:(?:where|is|not|has)\(\s*\)/g, "");
  const parts = stripped.split(/(\s+|\s*[>+~]\s*)/);
  for (const part of parts) {
    const p = part.trim();
    if (p === "" || /^[>+~]$/.test(p)) continue;
    if (/^::?[a-zA-Z-]/.test(p)) return null;
  }
  const cleaned = stripped.replace(/\s{2,}/g, " ").trim();
  if (cleaned.length === 0) return null;
  if (/^[>+~]/.test(cleaned) || /[>+~]$/.test(cleaned)) return null;
  return cleaned;
}

/** Manifest key src/app/login/login.component.ts -> route id /login. */
export function angularComponentManifestKeyToRouteId(key: string): string | null {
  if (/^src\/app\/app\.component\.(?:ts|js)$/i.test(key)) return null;
  const m = /^src\/app\/(.+)\.component\.(?:ts|js)$/i.exec(key);
  if (m === null || m[1] === undefined) return null;
  let path = m[1].replace(/\\/g, "/");
  const parts = path.split("/").filter(Boolean);
  if (parts.length >= 2 && parts[parts.length - 1] === parts[parts.length - 2]) {
    parts.pop();
  }
  if (parts.length === 0 || (parts.length === 1 && parts[0] === "app")) return "/";
  return `/${parts.map((seg) => kebabCase(seg)).join("/")}`;
}

function manifestHasAngularComponentEntries(manifest: Record<string, ViteManifestEntry>): boolean {
  return Object.keys(manifest).some((k) => angularComponentManifestKeyToRouteId(k) !== null);
}

/** Resolve `dist/<project>/browser` from `angular.json` outputPath. */
export function resolveAngularBrowserRoot(buildRoot: string): string | null {
  const angPath = join(buildRoot, "angular.json");
  if (!existsSync(angPath)) return null;
  const cfg = JSON.parse(readFileSync(angPath, "utf8")) as {
    projects?: Record<string, { architect?: { build?: { options?: { outputPath?: string } } } }>;
  };
  for (const project of Object.values(cfg.projects ?? {})) {
    const outputPath = project.architect?.build?.options?.outputPath;
    if (typeof outputPath !== "string") continue;
    const browser = join(buildRoot, outputPath, "browser");
    const manifestCandidates = [
      join(browser, ".vite", "manifest.json"),
      join(browser, "manifest.json"),
    ];
    if (manifestCandidates.some((p) => existsSync(p))) return browser;
  }
  return null;
}

function fallbackStylesheets(manifest: Record<string, ViteManifestEntry>): string[] {
  const keys = ["src/main.ts", "src/app/app.component.ts", "src/app/app.config.ts"];
  const sheets: string[] = [];
  for (const key of keys) {
    for (const s of collectManifestCss(manifest, key)) {
      if (!sheets.includes(s)) sheets.push(s);
    }
  }
  return sheets;
}

/** Angular emulated encapsulation adapter. */
export const angularCssAdapter: UiFrameworkCssAdapter = {
  name: "angular",
  detect(buildRoot) {
    const browser = resolveAngularBrowserRoot(buildRoot);
    if (browser === null) return false;
    const manifest = readViteManifest(browser);
    return manifestHasAngularComponentEntries(manifest);
  },
  routeStyleSources(buildRoot) {
    const browser = resolveAngularBrowserRoot(buildRoot);
    if (browser === null) return { routes: [], fallbackStylesheets: [] };
    const manifest = readViteManifest(browser);
    const routes: UiRouteStyleSources[] = [];
    for (const key of Object.keys(manifest).sort()) {
      const routeId = angularComponentManifestKeyToRouteId(key);
      if (routeId === null) continue;
      const sheets = collectManifestCss(manifest, key);
      if (sheets.length === 0) continue;
      routes.push({ routeId, stylesheets: sheets });
    }
    return { routes, fallbackStylesheets: fallbackStylesheets(manifest) };
  },
  resolveStylesheet(buildRoot, stylesheet) {
    const browser = resolveAngularBrowserRoot(buildRoot);
    if (browser === null) return join(buildRoot, stylesheet);
    return join(browser, stylesheet);
  },
  descopeSelector: descopeAngularSelector,
  routePatternSource: uiRoutePatternSource,
};
