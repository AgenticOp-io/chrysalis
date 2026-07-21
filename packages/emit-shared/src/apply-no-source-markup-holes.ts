/**
 * Explicit holes / honest form shells for CWL `@page` routes with no source markup
 * (D6369 / G9480; form shells D6400 / G9790).
 *
 * Prefer holes or empty chrome shells over invented business fields (DESIGN §3 item 6).
 */
import { extractCwlRouteBlock, listCwlPageGetPaths, patchCwlRouteBlockHtml } from "./apply-ui-markup-to-cwl.js";

export const MARKUP_NO_SOURCE_HOLE_REASON = "legacy:markup-no-source-route" as const;

/** Minimal HTML shell declaring a no-source markup hole. */
export function buildNoSourceMarkupHoleHtml(httpPath: string, detail?: string): string {
  const safePath = httpPath.replace(/"/g, "'");
  // Avoid bare load-field identifiers (`source`, `path`, …) in free text —
  // CWL HTML template interpolation would substitute them (G1189).
  const safeDetail = (detail ?? `missing +page.svelte for ${httpPath}`)
    .replace(/"/g, "'")
    .slice(0, 200);
  return `<div class="cwl-markup-hole" data-cwl-hole="${MARKUP_NO_SOURCE_HOLE_REASON}" data-cwl-hole-detail="${safeDetail}" data-cwl-route="${safePath}"></div>`;
}

/**
 * Honest empty add-form chrome for routes without `+page.svelte` (G9790).
 * Layout + disabled submit only — never invents business fields.
 */
export function buildNoSourceFormShellHtml(httpPath: string): string {
  const safePath = httpPath.replace(/"/g, "'");
  const parent = (httpPath.replace(/\/add\/?$/, "") || "/")
    .replace(/:tenantId/g, "preview-tenant")
    .replace(/:([A-Za-z0-9_]+)/g, "preview");
  const safeParent = parent.replace(/"/g, "'");
  const leaf = httpPath
    .replace(/\/add\/?$/, "")
    .split("/")
    .filter(Boolean)
    .pop();
  const label = leaf
    ? `Add ${leaf.replace(/-/g, " ").replace(/^:/, "")}`
    : "Add";
  // Avoid load-field idents in free text (G1189): no bare "source" / "path".
  // Converted empty add pages get a live POST form host; client fills fields from route.
  return (
    `<section class="cwl-form-shell" data-cwl-form-shell="converted-add" data-cwl-route="${safePath}" data-cwl-island="form">` +
    `<header class="cwl-form-shell-header"><h1>${label}</h1>` +
    `<a class="cwl-form-shell-back" href="${safeParent}">Back</a></header>` +
    `<form class="cwl-converted-shell-form cwl-form-shell-form" method="post" action="${safePath}" data-cwl-form-shell-empty="true">` +
    `<p class="cwl-form-shell-note">Converted add form — fields hydrate from the page API.</p>` +
    `<button type="submit" class="btn-primary">Save</button></form></section>`
  );
}

export interface ApplyNoSourceMarkupHolesOptions {
  readonly cwlSource: string;
  /** Paths that already have (or will have) lifted markup — leave alone. */
  readonly knownSourcePaths?: ReadonlySet<string>;
  /**
   * When true, only rewrite routes whose HTML still looks like a synthetic
   * demo shell (`wisp-module-demo` / `wisp-m32-add`). Default true.
   * Ignored when `formShell` is true (upgrades demo, stale, and hole markers).
   */
  readonly onlyDemoShells?: boolean;
  /**
   * When true, emit `buildNoSourceFormShellHtml` instead of hole markers and
   * upgrade existing no-source holes to form shells (G9790).
   */
  readonly formShell?: boolean;
}

export interface ApplyNoSourceMarkupHolesResult {
  readonly text: string;
  readonly routesRewritten: number;
  readonly routesSkipped: number;
  readonly rewrittenPaths: readonly string[];
}

function looksLikeSyntheticDemoShell(block: string): boolean {
  return (
    /\bwisp-module-demo\b/.test(block) ||
    /\bwisp-m32-add\b/.test(block) ||
    /\bsource:\s*"wisp-m32-add"/.test(block)
  );
}

/** True when hole HTML still uses unsafe attrs/detail that load-field interp can corrupt. */
function looksLikeStaleNoSourceHole(block: string): boolean {
  // CWL `return html "..."` escapes inner quotes as \"
  const hasHole =
    block.includes(`data-cwl-hole="${MARKUP_NO_SOURCE_HOLE_REASON}"`) ||
    block.includes(`data-cwl-hole=\\"${MARKUP_NO_SOURCE_HOLE_REASON}\\"`);
  if (!hasHole) return false;
  return (
    /\bdata-cwl-path=/.test(block) ||
    /no source page for/.test(block) ||
    !/\bdata-cwl-route=/.test(block)
  );
}

function blockHasNoSourceHole(block: string): boolean {
  return (
    block.includes(`data-cwl-hole="${MARKUP_NO_SOURCE_HOLE_REASON}"`) ||
    block.includes(`data-cwl-hole=\\"${MARKUP_NO_SOURCE_HOLE_REASON}\\"`)
  );
}

function blockHasFormShell(block: string): boolean {
  return /\bdata-cwl-form-shell=/.test(block) || /data-cwl-form-shell=\\?"/.test(block);
}

/**
 * Replace synthetic demo HTML (or empty shells) on routes without source
 * markup with an explicit `legacy:markup-no-source-route` hole, or — when
 * `formShell` — an honest empty form chrome (G9790).
 * Also normalizes stale hole HTML (`data-cwl-path` / "no source page") to the
 * mid-token-safe form (D6369).
 */
export function applyNoSourceMarkupHolesToCwlSource(
  opts: ApplyNoSourceMarkupHolesOptions,
): ApplyNoSourceMarkupHolesResult {
  const formShell = opts.formShell === true;
  const onlyDemo = opts.onlyDemoShells !== false;
  const known = opts.knownSourcePaths ?? new Set<string>();
  let text = opts.cwlSource;
  let routesRewritten = 0;
  let routesSkipped = 0;
  const rewrittenPaths: string[] = [];

  for (const httpPath of listCwlPageGetPaths(text)) {
    if (known.has(httpPath)) {
      routesSkipped += 1;
      continue;
    }
    const block = extractCwlRouteBlock(text, httpPath);
    if (block === null) {
      routesSkipped += 1;
      continue;
    }
    if (blockHasFormShell(block)) {
      routesSkipped += 1;
      continue;
    }
    const staleHole = looksLikeStaleNoSourceHole(block);
    const demoShell = looksLikeSyntheticDemoShell(block);
    const hasHole = blockHasNoSourceHole(block);
    if (formShell) {
      // Upgrade demo shells and no-source hole markers to empty form chrome.
      if (!demoShell && !staleHole && !hasHole) {
        routesSkipped += 1;
        continue;
      }
    } else {
      if (onlyDemo && !demoShell && !staleHole) {
        routesSkipped += 1;
        continue;
      }
      if (hasHole && !staleHole) {
        routesSkipped += 1;
        continue;
      }
    }
    const shellHtml = formShell
      ? buildNoSourceFormShellHtml(httpPath)
      : buildNoSourceMarkupHoleHtml(httpPath);
    const patched = patchCwlRouteBlockHtml(block, shellHtml);
    if (patched === null) {
      routesSkipped += 1;
      continue;
    }
    const loadSource = formShell ? "markup-form-shell" : "markup-no-source";
    // Retag load source for honesty
    const withLoad = patched.replace(
      /load\s*\{([^}]*)\}/s,
      (_m, inner: string) => {
        let next = String(inner);
        if (/\bsource\s*:/.test(next)) {
          next = next.replace(/\bsource\s*:\s*"[^"]*"/, `source: "${loadSource}"`);
        } else {
          next = `${next.trim()}${next.trim() ? ", " : ""}source: "${loadSource}"`;
        }
        return `load { ${next.trim()} }`;
      },
    );
    const at = text.indexOf(block);
    if (at >= 0) {
      text = text.slice(0, at) + withLoad + text.slice(at + block.length);
    }
    routesRewritten += 1;
    rewrittenPaths.push(httpPath);
  }

  return { text, routesRewritten, routesSkipped, rewrittenPaths };
}
