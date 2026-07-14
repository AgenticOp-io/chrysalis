/**
 * Angular static + structural-shell component template markup adapter (G9307 / G9926 / G9931).
 */
import { existsSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import type { UiFrameworkMarkupAdapter } from "./ui-markup.js";
import { uiRoutePatternSource } from "./ui-route-patterns.js";
import { kebabCase } from "./ui-assets-vite-shared.js";
import { finalizeStaticMarkup } from "./ui-markup-static.js";
import { liftStructuralAngularSource } from "./ui-markup-angular-structural.js";
import { liftAngularComponentTsWithDiGraph } from "./ui-markup-angular-di-graph.js";

/** src/app/login/login.component.html -> /login */
export function angularTemplateFileToRouteId(relPath: string): string | null {
  const norm = relPath.replace(/\\/g, "/");
  if (/^src\/app\/app\.component\.html$/i.test(norm)) return null;
  const mHtml = /^src\/app\/(.+)\.component\.html$/i.exec(norm);
  const mTs = /^src\/app\/(.+)\.component\.ts$/i.exec(norm);
  const m = mHtml ?? mTs;
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
  // Refuse TypeScript / DI sources in static mode.
  if (/@Component\b/.test(source) || /@Injectable\b/.test(source)) return null;
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
        const sourceFiles = [rel];
        const tsRel = rel.replace(/\.html$/i, ".ts");
        if (existsSync(join(buildRoot, tsRel))) sourceFiles.push(tsRel);
        return { routeId, sourceFiles };
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
  liftPageMarkup(source, _routeId, mode, _structuralOpts, fileAbsPath) {
    if (mode === "static") {
      const html = liftStaticAngularTemplateHtml(source);
      return html === null ? null : { html, liftMode: "static", holes: [] };
    }
    const lifted = liftStructuralAngularSource(source);
    if (lifted === null) return null;
    const holes = [...lifted.holes];
    const isTs =
      /\.ts$/i.test(fileAbsPath ?? "") ||
      /@Component\b/.test(source) ||
      /\binject\s*\(/.test(source);
    if (isTs && fileAbsPath) {
      const { holes: graphHoles } = liftAngularComponentTsWithDiGraph(source, fileAbsPath);
      for (const h of graphHoles) {
        if (!holes.some((x) => x.reason === h.reason && x.detail === h.detail)) {
          holes.push(h);
        }
      }
    }
    return {
      html: lifted.html,
      liftMode:
        holes.length > 0 || lifted.liftMode === "structural-shell"
          ? "structural-shell"
          : lifted.liftMode,
      holes,
    };
  },
  routePatternSource: uiRoutePatternSource,
};
