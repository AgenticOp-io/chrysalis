/**
 * Next.js App Router CSS adapter (G9930 / D6422; layout/globals depth G9940 / D6425).
 * Lifts co-located `page.module.css` / CSS imports + ancestor `layout` CSS without a `.next` build.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import type { UiFrameworkCssAdapter, UiRouteStyleSources } from "./ui-assets.js";
import { uiRoutePatternSource } from "./ui-route-patterns.js";
import { descopeCssModuleSelector } from "./ui-assets-css-modules.js";
import { nextAppPageFileToRouteId } from "./ui-markup-next.js";

/** De-scope Next / CSS-module selectors (exported for tests). */
export function descopeNextCssSelector(selector: string): string | null {
  return descopeCssModuleSelector(selector);
}

function discoverNextPageFiles(buildRoot: string): string[] {
  const appDir = join(buildRoot, "app");
  if (!existsSync(appDir)) return [];
  const files: string[] = [];
  function walk(dir: string, depth: number): void {
    if (depth > 14 || !existsSync(dir)) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const p = join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === "node_modules" || ent.name === ".next") continue;
        walk(p, depth + 1);
      } else if (/^page\.(tsx|jsx|ts|js)$/i.test(ent.name)) {
        files.push(p);
      }
    }
  }
  walk(appDir, 0);
  return files.sort();
}

function hasNextConfig(buildRoot: string): boolean {
  return (
    existsSync(join(buildRoot, "next.config.js")) ||
    existsSync(join(buildRoot, "next.config.mjs")) ||
    existsSync(join(buildRoot, "next.config.ts")) ||
    existsSync(join(buildRoot, "next.config.cjs"))
  );
}

function pushUnique(sheets: string[], rel: string): void {
  if (!sheets.includes(rel)) sheets.push(rel);
}

function collectCssImportsFromFile(buildRoot: string, fileAbs: string, sheets: string[]): void {
  const fileDir = dirname(fileAbs);
  for (const name of ["layout.module.css", "layout.css", "styles.module.css", "styles.css"]) {
    const abs = join(fileDir, name);
    if (!existsSync(abs)) continue;
    pushUnique(sheets, relative(buildRoot, abs).replace(/\\/g, "/"));
  }
  let source = "";
  try {
    source = readFileSync(fileAbs, "utf8");
  } catch {
    return;
  }
  const importRe =
    /import\s+(?:[\w*{}\s,]+\s+from\s+)?['"](\.[^'"]+\.(?:module\.)?css)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = importRe.exec(source)) !== null) {
    const spec = m[1]!;
    const abs = join(fileDir, spec);
    if (!existsSync(abs)) continue;
    pushUnique(sheets, relative(buildRoot, abs).replace(/\\/g, "/"));
  }
}

/**
 * Collect CSS from ancestor App Router `layout.*` files (root → nested).
 * Layout CSS is attributed to descendant pages (G9940) — not invented styles.
 */
export function collectNextLayoutStylesheets(buildRoot: string, pageAbs: string): string[] {
  const appDir = join(buildRoot, "app");
  if (!existsSync(appDir)) return [];
  const sheets: string[] = [];
  const pageDir = dirname(pageAbs);
  const dirs: string[] = [];
  let cur = pageDir;
  for (let i = 0; i < 16; i++) {
    dirs.push(cur);
    if (cur === appDir) break;
    const parent = dirname(cur);
    if (parent === cur) break;
    // Stop if we left the app tree.
    const rel = relative(appDir, parent);
    if (rel.startsWith("..")) break;
    cur = parent;
  }
  // Root-first cascade: reverse walk so app/layout precedes nested layouts.
  for (const dir of dirs.reverse()) {
    for (const name of ["layout.tsx", "layout.jsx", "layout.ts", "layout.js"]) {
      const abs = join(dir, name);
      if (!existsSync(abs)) continue;
      collectCssImportsFromFile(buildRoot, abs, sheets);
      break;
    }
  }
  return sheets;
}

/**
 * Resolve stylesheet paths for one App Router page (layout chain + co-located + imports).
 * Paths are project-relative posix.
 */
export function collectNextPageStylesheets(buildRoot: string, pageAbs: string): string[] {
  const sheets = collectNextLayoutStylesheets(buildRoot, pageAbs);
  const pageDir = dirname(pageAbs);
  const colocated = [
    "page.module.css",
    "page.css",
    "styles.module.css",
    "styles.css",
  ];
  for (const name of colocated) {
    const abs = join(pageDir, name);
    if (existsSync(abs)) {
      pushUnique(sheets, relative(buildRoot, abs).replace(/\\/g, "/"));
    }
  }

  let source = "";
  try {
    source = readFileSync(pageAbs, "utf8");
  } catch {
    return sheets;
  }

  const importRe =
    /import\s+(?:[\w*{}\s,]+\s+from\s+)?['"](\.[^'"]+\.(?:module\.)?css)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = importRe.exec(source)) !== null) {
    const spec = m[1]!;
    const abs = join(pageDir, spec);
    if (!existsSync(abs)) continue;
    pushUnique(sheets, relative(buildRoot, abs).replace(/\\/g, "/"));
  }
  return sheets;
}

function fallbackStylesheets(buildRoot: string): string[] {
  // Orphan globals (not imported by any layout) stay as shared fallback only.
  const candidates = [
    "app/globals.css",
    "app/global.css",
    "app/layout.css",
    "styles/globals.css",
  ];
  return candidates.filter((rel) => existsSync(join(buildRoot, rel)));
}

/** Next.js App Router CSS adapter. */
export const nextAppCssAdapter: UiFrameworkCssAdapter = {
  name: "next-app",
  detect(buildRoot) {
    if (!existsSync(join(buildRoot, "app"))) return false;
    if (!hasNextConfig(buildRoot) && discoverNextPageFiles(buildRoot).length === 0) return false;
    return discoverNextPageFiles(buildRoot).some(
      (abs) => collectNextPageStylesheets(buildRoot, abs).length > 0,
    ) || fallbackStylesheets(buildRoot).length > 0;
  },
  routeStyleSources(buildRoot) {
    const routes: UiRouteStyleSources[] = [];
    const attributed = new Set<string>();
    for (const abs of discoverNextPageFiles(buildRoot)) {
      const rel = relative(buildRoot, abs).replace(/\\/g, "/");
      const routeId = nextAppPageFileToRouteId(rel);
      if (!routeId) continue;
      const sheets = collectNextPageStylesheets(buildRoot, abs);
      for (const s of sheets) attributed.add(s);
      if (sheets.length === 0) continue;
      routes.push({ routeId, stylesheets: sheets });
    }
    const fallback = fallbackStylesheets(buildRoot).filter((s) => !attributed.has(s));
    return { routes, fallbackStylesheets: fallback };
  },
  resolveStylesheet(buildRoot, stylesheet) {
    return join(buildRoot, stylesheet);
  },
  descopeSelector: descopeNextCssSelector,
  routePatternSource: uiRoutePatternSource,
};
