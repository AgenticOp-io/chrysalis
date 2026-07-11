/**
 * Angular static component template markup adapter (G9307).
 */
import { existsSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import type { UiFrameworkMarkupAdapter } from "./ui-markup.js";
import { uiRoutePatternSource } from "./ui-route-patterns.js";
import { kebabCase } from "./ui-assets-vite-shared.js";
import { finalizeStaticMarkup } from "./ui-markup-static.js";

/** src/app/login/login.component.html -> /login */
export function angularTemplateFileToRouteId(relPath: string): string | null {
  const norm = relPath.replace(/\\/g, "/");
  if (/^src\/app\/app\.component\.html$/i.test(norm)) return null;
  const m = /^src\/app\/(.+)\.component\.html$/i.exec(norm);
  if (m === null || m[1] === undefined) return null;
  const parts = m[1].split("/").filter(Boolean);
  if (parts.length >= 2 && parts[parts.length - 1] === parts[parts.length - 2]) {
    parts.pop();
  }
  if (parts.length === 0) return "/";
  return `/${parts.map((seg) => kebabCase(seg)).join("/")}`;
}

/** Lift static HTML from an Angular component template file. */
export function liftStaticAngularTemplateHtml(source: string): string | null {
  const finalized = finalizeStaticMarkup(source);
  return finalized?.html ?? null;
}

function discoverAngularTemplateFiles(buildRoot: string): string[] {
  const appDir = join(buildRoot, "src/app");
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
      else if (ent.name.endsWith(".component.html")) files.push(p);
    }
  }
  walk(appDir, 0);
  return files.sort();
}

/** Angular component template markup adapter. */
export const angularMarkupAdapter: UiFrameworkMarkupAdapter = {
  name: "angular",
  detect(buildRoot) {
    return existsSync(join(buildRoot, "angular.json")) && discoverAngularTemplateFiles(buildRoot).length > 0;
  },
  routeMarkupSources(buildRoot) {
    const routes = discoverAngularTemplateFiles(buildRoot)
      .map((abs) => {
        const rel = relative(buildRoot, abs).replace(/\\/g, "/");
        const routeId = angularTemplateFileToRouteId(rel);
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
    return liftStaticAngularTemplateHtml(source);
  },
  routePatternSource: uiRoutePatternSource,
};
