/**
 * Apply lifted per-route HTML into CWL `@page` handlers (G9309).
 */
import type { UiMarkupBundle, UiRouteMarkupMapV1 } from "@chrysalis/webir";
import { findRouteMarkupBundle } from "./ui-route-markup.js";

export interface ApplyUiMarkupToCwlResult {
  readonly text: string;
  readonly routesPatched: number;
  readonly routesSkipped: number;
  readonly routesWithoutBundle: number;
}

/** List `@page GET` paths from a CWL source file. */
export function listCwlPageGetPaths(cwlSource: string): string[] {
  const paths: string[] = [];
  for (const m of cwlSource.matchAll(/@page\s+GET\s+"([^"]+)"/gi)) {
    const p = m[1];
    if (p !== undefined) paths.push(p);
  }
  return [...new Set(paths)];
}

/** Extract one route handler block starting at `@page` / `@route`. */
export function extractCwlRouteBlock(cwlSource: string, httpPath: string): string | null {
  const markers = [`@page GET "${httpPath}"`, `@route GET "${httpPath}"`];
  let start = -1;
  for (const marker of markers) {
    start = cwlSource.indexOf(marker);
    if (start >= 0) break;
  }
  if (start < 0) return null;
  const brace = cwlSource.indexOf("{", start);
  if (brace < 0) return null;
  let depth = 0;
  let inString: '"' | "'" | null = null;
  for (let i = brace; i < cwlSource.length; i++) {
    const ch = cwlSource[i];
    if (inString !== null) {
      if (ch === "\\" && i + 1 < cwlSource.length) {
        i += 1;
        continue;
      }
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = ch;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return cwlSource.slice(start, i + 1);
    }
  }
  return null;
}

/** Build a CWL `return html "..."` statement from lifted markup. */
export function buildCwlReturnHtmlStatement(html: string): string {
  return `  return html ${JSON.stringify(html)};`;
}

/**
 * Find a `return html "…";` span, scanning quoted strings so `;` inside HTML
 * (e.g. `Seed &amp; env:`) does not truncate the match.
 */
export function findCwlHtmlReturnSpan(block: string): { start: number; end: number } | null {
  const m = /\breturn\s+html\s+"/i.exec(block);
  if (m === null || m.index === undefined) return null;
  const contentStart = m.index + m[0].length;
  let i = contentStart;
  while (i < block.length) {
    const ch = block[i];
    if (ch === "\\" && i + 1 < block.length) {
      i += 2;
      continue;
    }
    if (ch === '"') {
      let j = i + 1;
      while (j < block.length && /\s/.test(block[j]!)) j++;
      if (block[j] === ";") return { start: m.index, end: j + 1 };
      // Bare quote mid-string (corrupt prior emit) — keep scanning for a closer
    }
    i += 1;
  }
  return null;
}

/**
 * Patch one route block's `return html` with lifted markup. Returns null when
 * the block has no simple `return html` to replace (holes, `return ui`, etc.).
 * Never uses a `;`-truncated fallback — that corrupts HTML containing semicolons.
 */
export function patchCwlRouteBlockHtml(block: string, html: string): string | null {
  const span = findCwlHtmlReturnSpan(block);
  if (span === null) return null;
  return block.slice(0, span.start) + buildCwlReturnHtmlStatement(html).trim() + block.slice(span.end);
}

/**
 * Apply lifted markup bundles into matching `@page GET` routes in a CWL source.
 * Only patches routes with a bundle and a replaceable `return html` body.
 */
export function applyLiftedMarkupToCwlSource(
  cwlSource: string,
  map: UiRouteMarkupMapV1,
  bundles: ReadonlyArray<UiMarkupBundle>,
): ApplyUiMarkupToCwlResult {
  let text = cwlSource;
  let routesPatched = 0;
  let routesSkipped = 0;
  let routesWithoutBundle = 0;

  for (const httpPath of listCwlPageGetPaths(cwlSource)) {
    const bundle = findRouteMarkupBundle(map, bundles, httpPath);
    if (bundle === null) {
      routesWithoutBundle += 1;
      continue;
    }
    const block = extractCwlRouteBlock(text, httpPath);
    if (block === null) {
      routesSkipped += 1;
      continue;
    }
    const patched = patchCwlRouteBlockHtml(block, bundle.html);
    if (patched === null) {
      routesSkipped += 1;
      continue;
    }
    // Replace only the first occurrence (never global — duplicate blocks must not multiply).
    const at = text.indexOf(block);
    if (at < 0) {
      routesSkipped += 1;
      continue;
    }
    text = text.slice(0, at) + patched + text.slice(at + block.length);
    routesPatched += 1;
  }

  return { text, routesPatched, routesSkipped, routesWithoutBundle };
}
