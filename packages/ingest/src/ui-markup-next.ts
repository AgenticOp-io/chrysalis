/**
 * Next.js App Router static page markup adapter (G9901).
 * Lifts `app/.../page.tsx|jsx` return JSX that is mostly static HTML.
 */
import { existsSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import type { UiFrameworkMarkupAdapter } from "./ui-markup.js";
import { uiRoutePatternSource } from "./ui-route-patterns.js";
import { kebabCase } from "./ui-assets-vite-shared.js";
import { finalizeStaticMarkup } from "./ui-markup-static.js";
import { liftStructuralNextPageJsx } from "./ui-markup-next-structural.js";

/** Extract JSX returned from a Next.js page module into HTML-ish markup. */
export function liftStaticNextPageJsx(source: string): string | null {
  const m =
    /return\s*\(\s*([\s\S]*?)\s*\);\s*(?:\}|$)/.exec(source) ??
    /return\s+([\s\S]*?);\s*(?:\}|$)/.exec(source);
  if (m === null || m[1] === undefined) return null;
  let jsx = m[1].trim();
  jsx = jsx.replace(/\bclassName=/g, "class=");
  // Static mode: refuse dynamics (no silent strip — use structural-shell / liftPageMarkup).
  if (/\{/.test(jsx) || /<\/?[A-Z][A-Za-z0-9_]*/.test(jsx)) return null;
  if (/["']use client["']/.test(source) || /\basync\s+function\b/.test(source)) return null;
  const finalized = finalizeStaticMarkup(jsx);
  return finalized?.html ?? null;
}

/** app/login/page.tsx -> /login ; app/page.tsx -> / */
export function nextAppPageFileToRouteId(relPath: string): string | null {
  const m = /^app\/(.+)\/page\.(tsx|jsx|ts|js)$/i.exec(relPath.replace(/\\/g, "/"));
  if (m === null || m[1] === undefined) {
    if (/^app\/page\.(tsx|jsx|ts|js)$/i.test(relPath.replace(/\\/g, "/"))) return "/";
    return null;
  }
  let path = m[1];
  if (/^\(.*\)$/.test(path.split("/")[0] ?? "")) {
    // route group (marketing) — strip group segment
    path = path
      .split("/")
      .filter((seg) => !/^\(.*\)$/.test(seg))
      .join("/");
  }
  if (!path || path === "page") return "/";
  return `/${path.split("/").map((seg) => kebabCase(seg.replace(/^\[|\]$/g, "p"))).join("/")}`;
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

/** Next.js App Router markup adapter. */
export const nextAppMarkupAdapter: UiFrameworkMarkupAdapter = {
  name: "next-app",
  detect(buildRoot) {
    return (
      existsSync(join(buildRoot, "app")) &&
      (existsSync(join(buildRoot, "next.config.js")) ||
        existsSync(join(buildRoot, "next.config.mjs")) ||
        existsSync(join(buildRoot, "next.config.ts")) ||
        discoverNextPageFiles(buildRoot).length > 0)
    );
  },
  routeMarkupSources(buildRoot) {
    const routes = discoverNextPageFiles(buildRoot)
      .map((abs) => {
        const rel = relative(buildRoot, abs).replace(/\\/g, "/");
        const routeId = nextAppPageFileToRouteId(rel);
        if (!routeId) return null;
        return { routeId, sourceFiles: [rel] };
      })
      .filter((r): r is { routeId: string; sourceFiles: string[] } => r !== null);
    return { routes };
  },
  resolveSourceFile(buildRoot, sourceFile) {
    return join(buildRoot, sourceFile);
  },
  liftPageHtml(source) {
    return liftStaticNextPageJsx(source);
  },
  liftPageMarkup(source, _routeId, mode, _structuralOpts, fileAbsPath) {
    if (mode === "static") {
      const html = liftStaticNextPageJsx(source);
      return html === null ? null : { html, liftMode: "static", holes: [] };
    }
    const lifted = liftStructuralNextPageJsx(source, fileAbsPath);
    if (lifted === null) return null;
    return {
      html: lifted.html,
      liftMode: lifted.liftMode,
      holes: lifted.holes,
    };
  },
  routePatternSource: uiRoutePatternSource,
};
