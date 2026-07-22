/**
 * PHP Blade / Laravel view markup adapter (basic structural-shell).
 * Paired with scripts/lib/site-inventory/php-blade.mjs.
 */
import { existsSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import type { UiFrameworkMarkupAdapter } from "./ui-markup.js";
import { uiRoutePatternSource } from "./ui-route-patterns.js";
import { kebabCase } from "./ui-assets-vite-shared.js";
import { finalizeStaticMarkup } from "./ui-markup-static.js";
import { liftStructuralBladeTemplateHtml } from "./ui-markup-blade-structural.js";

/** resources/views/login.blade.php -> /login */
export function bladeSourceFileToRouteId(relPath: string): string | null {
  const m = /^resources\/views\/(.+)\.blade\.php$/i.exec(relPath.replace(/\\/g, "/"));
  if (m === null || m[1] === undefined) return null;
  let path = m[1].replace(/\/index$/i, "");
  if (/^(index|home|welcome)$/i.test(path)) return "/";
  // Drop common Laravel layout-only dirs from route id when under pages/
  path = path.replace(/^(pages|page)\//i, "");
  if (path.length === 0) return "/";
  return `/${path.split("/").map((seg) => kebabCase(seg)).join("/")}`;
}

function discoverBladeViewFiles(buildRoot: string): string[] {
  const root = join(buildRoot, "resources", "views");
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
        // Skip component/partial trees as routes
        if (/^(components|partials|layouts|vendor)$/i.test(ent.name)) continue;
        walk(p, depth + 1);
      } else if (ent.name.toLowerCase().endsWith(".blade.php")) {
        files.push(p);
      }
    }
  }
  walk(root, 0);
  return files.sort();
}

export function liftStaticBladeTemplateHtml(source: string): string | null {
  const lifted = liftStructuralBladeTemplateHtml(source);
  if (lifted === null) return null;
  if (lifted.liftMode === "static") return lifted.html;
  // Static mode refuses residual dynamics
  if (lifted.holes.length > 0) return null;
  const fin = finalizeStaticMarkup(lifted.html);
  return fin?.html ?? null;
}

/** PHP Blade view markup adapter. */
export const phpBladeMarkupAdapter: UiFrameworkMarkupAdapter = {
  name: "php-blade",
  detect(buildRoot) {
    return discoverBladeViewFiles(buildRoot).length > 0;
  },
  routeMarkupSources(buildRoot) {
    const routes = discoverBladeViewFiles(buildRoot)
      .map((abs) => {
        const rel = relative(buildRoot, abs).replace(/\\/g, "/");
        const routeId = bladeSourceFileToRouteId(rel);
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
    return liftStaticBladeTemplateHtml(source);
  },
  liftPageMarkup(source, _routeId, mode) {
    if (mode === "static") {
      const html = liftStaticBladeTemplateHtml(source);
      return html === null ? null : { html, liftMode: "static", holes: [] };
    }
    const lifted = liftStructuralBladeTemplateHtml(source);
    if (lifted === null) return null;
    return {
      html: lifted.html,
      liftMode: lifted.liftMode,
      holes: lifted.holes,
    };
  },
  routePatternSource: uiRoutePatternSource,
};
