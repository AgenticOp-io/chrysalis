/**
 * Explicit holes for CWL `@page` routes with no source markup (D6369 / G9480).
 *
 * Prefer holes over invented demo HTML (DESIGN §3 item 6).
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

export interface ApplyNoSourceMarkupHolesOptions {
  readonly cwlSource: string;
  /** Paths that already have (or will have) lifted markup — leave alone. */
  readonly knownSourcePaths?: ReadonlySet<string>;
  /**
   * When true, only rewrite routes whose HTML still looks like a synthetic
   * demo shell (`wisp-module-demo` / `wisp-m32-add`). Default true.
   */
  readonly onlyDemoShells?: boolean;
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

/**
 * Replace synthetic demo HTML (or empty shells) on routes without source
 * markup with an explicit `legacy:markup-no-source-route` hole.
 * Also normalizes stale hole HTML (`data-cwl-path` / "no source page") to the
 * mid-token-safe form (D6369).
 */
export function applyNoSourceMarkupHolesToCwlSource(
  opts: ApplyNoSourceMarkupHolesOptions,
): ApplyNoSourceMarkupHolesResult {
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
    const staleHole = looksLikeStaleNoSourceHole(block);
    const demoShell = looksLikeSyntheticDemoShell(block);
    if (onlyDemo && !demoShell && !staleHole) {
      routesSkipped += 1;
      continue;
    }
    if (blockHasNoSourceHole(block) && !staleHole) {
      routesSkipped += 1;
      continue;
    }
    const holeHtml = buildNoSourceMarkupHoleHtml(httpPath);
    const patched = patchCwlRouteBlockHtml(block, holeHtml);
    if (patched === null) {
      routesSkipped += 1;
      continue;
    }
    // Retag load source for honesty
    const withLoad = patched.replace(
      /load\s*\{([^}]*)\}/s,
      (_m, inner: string) => {
        let next = String(inner);
        if (/\bsource\s*:/.test(next)) {
          next = next.replace(/\bsource\s*:\s*"[^"]*"/, `source: "markup-no-source"`);
        } else {
          next = `${next.trim()}${next.trim() ? ", " : ""}source: "markup-no-source"`;
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
