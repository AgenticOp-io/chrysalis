/**
 * Backend-agnostic consumption of the UI route→stylesheet map
 * (DESIGN D6365, G9300c; document shell D6368 / G9470).
 *
 * Every emit/serve backend links the matching route bundle **plus** the
 * shared layout fallback when present (D6365 rule 5). No backend-specific
 * behavior here.
 */
import type { UiRouteStyleMapV1 } from "@chrysalis/webir";

/**
 * Resolve the primary stylesheet href for a pathname: matching route bundle,
 * else layout fallback. Null only when neither applies.
 * Prefer {@link resolveRouteStylesheetHrefs} when emitting documents (route + fallback).
 */
export function resolveRouteStylesheetHref(map: UiRouteStyleMapV1, pathname: string): string | null {
  const matched = matchRouteStylesheetHref(map, pathname);
  if (matched !== null) return matched;
  return map.fallbackHref;
}

/** Route-matched href only (no fallback). */
export function matchRouteStylesheetHref(map: UiRouteStyleMapV1, pathname: string): string | null {
  const clean = pathname.split("?")[0] ?? "/";
  const normalized = clean === "" ? "/" : clean;
  for (const route of map.routes) {
    if (new RegExp(route.pattern).test(normalized)) return route.href;
  }
  return null;
}

/** Resolve layout fallback href, or null when absent. */
export function resolveFallbackStylesheetHref(map: UiRouteStyleMapV1): string | null {
  return map.fallbackHref;
}

/**
 * Ordered stylesheet hrefs for a page: route match (if any), then fallback
 * when present and distinct. Empty when neither applies.
 */
export function resolveRouteStylesheetHrefs(map: UiRouteStyleMapV1, pathname: string): string[] {
  const hrefs: string[] = [];
  const routeHref = matchRouteStylesheetHref(map, pathname);
  if (routeHref !== null) hrefs.push(routeHref);
  const fallback = map.fallbackHref;
  if (fallback !== null && fallback !== routeHref) hrefs.push(fallback);
  return hrefs;
}

function escapeHrefAttr(href: string): string {
  return href.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** One `<link>` tag for a stylesheet href. */
export function stylesheetLinkTagForHref(href: string): string {
  return `<link rel="stylesheet" href="${escapeHrefAttr(href)}">`;
}

/**
 * Concatenated `<link>` tags for an emitted page (route + fallback), or empty
 * string when no bundle applies. Hrefs come from the lift (never user input).
 */
export function routeStylesheetLinkTag(map: UiRouteStyleMapV1, pathname: string): string {
  return resolveRouteStylesheetHrefs(map, pathname).map(stylesheetLinkTagForHref).join("");
}

export interface WrapHtmlDocumentShellOptions {
  readonly title?: string;
  readonly lang?: string;
  /** Extra head HTML inserted after stylesheet links (scripts, meta, …). */
  readonly extraHeadHtml?: string;
  /** Extra body-end HTML (deferred scripts, …). */
  readonly extraBodyHtml?: string;
}

/**
 * Wrap a body HTML fragment in a minimal document shell and inject per-route
 * stylesheet links from the UI style map (D6368 / G9470).
 *
 * If `bodyHtml` is already a full document (`<!DOCTYPE` / `<html`), injects
 * stylesheet links into `<head>` (creating head if needed) instead of wrapping.
 */
export function wrapHtmlFragmentWithDocumentShell(
  bodyHtml: string,
  map: UiRouteStyleMapV1 | null,
  pathname: string,
  opts: WrapHtmlDocumentShellOptions = {},
): string {
  const links = map !== null ? routeStylesheetLinkTag(map, pathname) : "";
  const trimmed = bodyHtml.trim();
  const isDocument = /^<!DOCTYPE\s+html/i.test(trimmed) || /^<html[\s>]/i.test(trimmed);

  if (isDocument) {
    if (links.length === 0) return bodyHtml;
    if (/<\/head>/i.test(trimmed)) {
      return trimmed.replace(/<\/head>/i, `${links}</head>`);
    }
    if (/<head[\s>]/i.test(trimmed)) {
      return trimmed.replace(/<head([^>]*)>/i, `<head$1>${links}`);
    }
    return trimmed.replace(/<html([^>]*)>/i, `<html$1><head>${links}</head>`);
  }

  const title = (opts.title ?? pathname).replace(/</g, "");
  const lang = opts.lang ?? "en";
  const extraHead = opts.extraHeadHtml ?? "";
  const extraBody = opts.extraBodyHtml ?? "";
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
${links}${extraHead}
</head>
<body>
${trimmed}
${extraBody}
</body>
</html>
`;
}
