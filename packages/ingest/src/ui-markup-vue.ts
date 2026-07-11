/**
 * Vite + Vue static template markup adapter (G9307).
 */
import { existsSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import type { UiFrameworkMarkupAdapter } from "./ui-markup.js";
import { uiRoutePatternSource } from "./ui-route-patterns.js";
import { kebabCase } from "./ui-assets-vite-shared.js";
import { finalizeStaticMarkup } from "./ui-markup-static.js";

/** Extract static template HTML from a .vue SFC. */
export function liftStaticVueTemplateHtml(source: string): string | null {
  const m = /<template[^>]*>([\s\S]*?)<\/template>/i.exec(source);
  if (m === null || m[1] === undefined) return null;
  const finalized = finalizeStaticMarkup(m[1]);
  return finalized?.html ?? null;
}

/** src/views/login.vue -> /login */
export function vueSourceFileToRouteId(relPath: string): string | null {
  const m = /^src\/(?:views|pages)\/(.+)\.vue$/i.exec(relPath.replace(/\\/g, "/"));
  if (m === null || m[1] === undefined) return null;
  let path = m[1];
  if (/^(index|home)$/i.test(path)) return "/";
  path = path.replace(/\/index$/i, "");
  if (path.length === 0) return "/";
  return `/${path.split("/").map((seg) => kebabCase(seg)).join("/")}`;
}

function discoverVuePageFiles(buildRoot: string): string[] {
  const roots = ["src/views", "src/pages"].map((d) => join(buildRoot, d));
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

/** Vite + Vue template markup adapter. */
export const viteVueMarkupAdapter: UiFrameworkMarkupAdapter = {
  name: "vite-vue",
  detect(buildRoot) {
    return discoverVuePageFiles(buildRoot).length > 0;
  },
  routeMarkupSources(buildRoot) {
    const routes = discoverVuePageFiles(buildRoot)
      .map((abs) => {
        const rel = relative(buildRoot, abs).replace(/\\/g, "/");
        const routeId = vueSourceFileToRouteId(rel);
        if (routeId === null) return null;
        return { routeId, sourceFiles: [rel] };
      })
      .filter((r): r is { routeId: string; sourceFiles: string[] } => r !== null);
    return { routes };
  },
  resolveSourceFile(buildRoot, sourceFile) {
    return join(buildRoot, sourceFile);
  },
  liftPageHtml(source) {
    return liftStaticVueTemplateHtml(source);
  },
  routePatternSource: uiRoutePatternSource,
};
