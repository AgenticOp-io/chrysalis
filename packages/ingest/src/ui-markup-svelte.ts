/**
 * SvelteKit static page markup lift (DESIGN D6365 extension, G9306;
 * structural-shell D6367 / G9460).
 */
import { readdirSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import type { UiFrameworkMarkupAdapter } from "./ui-markup.js";
import { svelteKitRoutePatternSource } from "./ui-assets.js";
import { liftStructuralSveltePageHtml } from "./ui-markup-svelte-structural.js";

/** Extract static markup from a simple +page.svelte (ported from hub sveltekit-route-lift). */
export function liftStaticSveltePageHtml(
  source: string,
  loadBools: Readonly<Record<string, boolean>> = {},
): string | null {
  let s = source.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
  s = s.replace(/\{@html\s+"([^"]*)"\s*\}/g, "$1");
  const eachRe = /\{#each\s+\[([^\]]+)\]\s+as\s+([a-zA-Z_][a-zA-Z0-9_]*)\}([\s\S]*?)\{\/each\}/g;
  s = s.replace(eachRe, (_m, itemsRaw, itemName, inner) => {
    const items = itemsRaw.split(",").map((x: string) => x.trim().replace(/^['"]|['"]$/g, ""));
    return items
      .map((item: string) => inner.replace(new RegExp(`\\{${itemName}\\}`, "g"), item))
      .join("");
  });
  // Tempered branch bodies: never swallow `{:else if …}` chains or nested
  // `{#if}` blocks — those must fall through to the structural lift, which
  // parses chains correctly (backend-management admin gate regression).
  const BRANCH = String.raw`((?:(?!\{:else|\{#if\b|\{\/if\})[\s\S])*?)`;
  s = s.replace(new RegExp(String.raw`\{#if\s+true\s*\}${BRANCH}\{:else\}${BRANCH}\{\/if\}`, "gi"), (_m, t) => t);
  s = s.replace(new RegExp(String.raw`\{#if\s+false\s*\}${BRANCH}\{:else\}${BRANCH}\{\/if\}`, "gi"), (_m, _t, f) => f);
  s = s.replace(
    new RegExp(String.raw`\{#if\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\}${BRANCH}\{:else\}${BRANCH}\{\/if\}`, "gi"),
    (m, name, t, f) => (Object.prototype.hasOwnProperty.call(loadBools, name) ? (loadBools[name] ? t : f) : m),
  );
  s = s.replace(
    new RegExp(String.raw`\{#if\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\}${BRANCH}\{\/if\}`, "gi"),
    (m, name, body) =>
      Object.prototype.hasOwnProperty.call(loadBools, name) ? (loadBools[name] ? body : "") : m,
  );
  if (/\{[#/@]/.test(s) || /\{[a-zA-Z_]/.test(s)) return null;
  // PascalCase tags are Svelte components — not static HTML (§3 / D6367).
  if (/<\/?[A-Z][A-Za-z0-9_]*/.test(s)) return null;
  s = s.trim();
  if (s.length === 0 || !/<[a-z]/i.test(s)) return null;
  return s;
}

/** Collect semantic class tokens from static HTML. */
export function extractHtmlClassNames(html: string): string[] {
  const names = new Set<string>();
  const re = /class\s*=\s*(['"])([^'"]+)\1/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[2];
    if (raw === undefined) continue;
    for (const part of raw.split(/\s+/)) {
      const c = part.trim();
      if (c.length > 0) names.add(c);
    }
  }
  return [...names].sort();
}

function svelteKitSegmentToPathPart(segment: string): string {
  if (segment.startsWith("[[") && segment.endsWith("]]")) return `:${segment.slice(2, -2)}`;
  if (segment.startsWith("[...") && segment.endsWith("]")) return `*${segment.slice(4, -1)}`;
  if (segment.startsWith("[") && segment.endsWith("]")) return `:${segment.slice(1, -1)}`;
  return segment;
}

/** Map a `+page.svelte` file under `routesRoot` to a framework route id. */
export function svelteKitPageFileToRouteId(routesRoot: string, pageFile: string): string {
  const dir = dirname(pageFile);
  const rel = relative(routesRoot, dir).replace(/\\/g, "/");
  if (!rel || rel === ".") return "/";
  const parts = rel.split("/").filter(Boolean).map(svelteKitSegmentToPathPart);
  return `/${parts.join("/")}`;
}

function findSvelteKitRoutesRoot(projectDir: string): string | null {
  const hits: string[] = [];
  function walk(dir: string, depth: number): void {
    if (depth > 12) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      if (ent.name === "node_modules" || ent.name === ".git" || ent.name === "generated") continue;
      const p = join(dir, ent.name);
      if (ent.isDirectory()) walk(p, depth + 1);
      else if (ent.name === "+page.svelte") {
        let cur = dirname(p);
        while (basename(cur) !== "routes" && cur !== projectDir && cur !== dirname(cur)) {
          cur = dirname(cur);
        }
        if (basename(cur) === "routes") hits.push(cur);
      }
    }
  }
  walk(projectDir, 0);
  hits.sort((a, b) => a.length - b.length);
  return hits[0] ?? null;
}

function discoverPageFiles(routesRoot: string): string[] {
  const files: string[] = [];
  function walk(dir: string, depth: number): void {
    if (depth > 12) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const p = join(dir, ent.name);
      if (ent.isDirectory()) walk(p, depth + 1);
      else if (ent.name === "+page.svelte") files.push(p);
    }
  }
  walk(routesRoot, 0);
  return files.sort();
}

/** SvelteKit +page.svelte markup adapter. */
export const svelteKitMarkupAdapter: UiFrameworkMarkupAdapter = {
  name: "sveltekit",
  detect(buildRoot) {
    return findSvelteKitRoutesRoot(buildRoot) !== null;
  },
  routeMarkupSources(buildRoot) {
    const routesRoot = findSvelteKitRoutesRoot(buildRoot);
    if (routesRoot === null) return { routes: [] };
    const routes = discoverPageFiles(routesRoot).map((file) => ({
      routeId: svelteKitPageFileToRouteId(routesRoot, file),
      sourceFiles: [relative(buildRoot, file).replace(/\\/g, "/")],
    }));
    return { routes };
  },
  resolveSourceFile(buildRoot, sourceFile) {
    return join(buildRoot, sourceFile);
  },
  liftPageHtml(source) {
    return liftStaticSveltePageHtml(source);
  },
  liftPageMarkup(source, _routeId, mode, structuralOpts) {
    if (mode === "static") {
      const html = liftStaticSveltePageHtml(source);
      return html === null ? null : { html, liftMode: "static", holes: [] };
    }
    const lifted = liftStructuralSveltePageHtml(source, {
      applyShowcaseLoadBools: true,
      ...(structuralOpts ?? {}),
    });
    if (lifted === null) return null;
    return {
      html: lifted.html,
      liftMode: lifted.liftMode,
      holes: lifted.holes,
    };
  },
  routePatternSource: svelteKitRoutePatternSource,
};
