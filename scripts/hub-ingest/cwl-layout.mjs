/**
 * CWL layout chrome wrap (RFC-0029 / Cinderpath expand).
 * Layout decls live in the parser; this module applies chrome at ingest / resolve.
 */

/** Slot in a document shell. Absent marker keeps RFC-0029 prefix concatenation. */
const CWL_HTML_BODY_SLOT = "<!-- cwl:body -->";
/** Per-page head fragment (title, meta). Replaced once. */
const CWL_HTML_HEAD_SLOT = "<!-- cwl:head -->";
/** Page decl name, for attributes such as data-ao-page. */
const CWL_HTML_PAGE_SLOT = "<!-- cwl:page -->";
/** `<!-- cwl:active <pageName> <classToken> -->` becomes ` <classToken>` on that page only. */
const CWL_HTML_ACTIVE_RE = /<!-- cwl:active\s+([A-Za-z][A-Za-z0-9_-]*)\s+([A-Za-z][A-Za-z0-9_-]*)\s*-->/g;

/**
 * Markers are resolved in the shell before head and body are inserted.
 * @param {string} chrome
 * @param {string} pageName
 */
function applyCwlPageMarkers(chrome, pageName) {
  const name = String(pageName ?? "");
  const withPage = chrome.split(CWL_HTML_PAGE_SLOT).join(name);
  return withPage.replace(CWL_HTML_ACTIVE_RE, (_m, page, token) => (page === name ? ` ${token}` : ""));
}

/**
 * @param {string | null | undefined} chrome
 * @param {string} body
 * @param {{ head?: string, pageName?: string }} [opts]
 */
export function composeLayoutChromeHtml(chrome, body, opts = {}) {
  if (!chrome) return body;
  const head = String(opts.head ?? "");
  let shell = applyCwlPageMarkers(chrome, opts.pageName ?? "");
  if (shell.includes(CWL_HTML_HEAD_SLOT)) shell = shell.replace(CWL_HTML_HEAD_SLOT, head);
  if (shell.includes(CWL_HTML_BODY_SLOT)) return shell.replace(CWL_HTML_BODY_SLOT, body);
  return `${shell}${body}`;
}

/** True when a declared head has nowhere to sit in the shell. */
export function chromeHasHeadSlot(chrome) {
  return String(chrome ?? "").includes(CWL_HTML_HEAD_SLOT);
}

/**
 * Merge layout bindings onto a page route (mutates route). Does not compose HTML.
 * @param {object} route
 * @param {object | undefined} layout
 */
export function mergeLayoutOntoRoute(route, layout) {
  if (!layout) return;
  route.handlerHeaders = route.handlerHeaders ?? [];
  route.handlerCookies = route.handlerCookies ?? [];
  route.handlerCookiePurposes = route.handlerCookiePurposes ?? [];
  route.attachmentHoles = route.attachmentHoles ?? [];
  route.attachmentHoleLines = route.attachmentHoleLines ?? [];
  route.attachmentHoleCharacters = route.attachmentHoleCharacters ?? [];
  route.attachmentHoleEndCharacters = route.attachmentHoleEndCharacters ?? [];
  for (const h of layout.headers ?? []) {
    if (!route.handlerHeaders.includes(h)) route.handlerHeaders.push(h);
  }
  for (const c of layout.cookies ?? []) {
    if (!route.handlerCookies.includes(c)) route.handlerCookies.push(c);
  }
  for (const p of layout.cookiePurposes ?? []) {
    if (!route.handlerCookiePurposes.some((x) => x.name === p.name)) {
      route.handlerCookiePurposes.push(p);
    }
  }
  for (const hole of layout.holes ?? []) {
    if (!route.attachmentHoles.includes(hole)) {
      route.attachmentHoles.push(hole);
      route.attachmentHoleLines.push(route.line ?? 1);
      route.attachmentHoleCharacters.push(0);
      route.attachmentHoleEndCharacters.push(4);
    }
  }
  for (const island of layout.pageIslands ?? []) {
    route.pageIslands = route.pageIslands ?? [];
    route.pageIslands.push(island);
  }
  if (layout.chromeHtml) route.layoutChromeHtml = layout.chromeHtml;
}

/**
 * After imports are merged, attach layout chrome/bindings to pages that use them.
 * @param {object} parsed
 */
export function applyLayoutsToParsedModule(parsed) {
  const byName = new Map();
  for (const L of parsed.layouts ?? []) {
    if (L?.name) byName.set(L.name, L);
  }
  for (const r of parsed.routes ?? []) {
    if (!r.layoutName) continue;
    const L = byName.get(r.layoutName);
    if (!L) {
      r.attachmentHoles = r.attachmentHoles ?? [];
      if (!r.attachmentHoles.includes("cwl:unknown-layout")) {
        r.attachmentHoles.push("cwl:unknown-layout");
      }
      continue;
    }
    mergeLayoutOntoRoute(r, L);
  }
}
