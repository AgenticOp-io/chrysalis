/**
 * CWL layout chrome wrap (RFC-0029 / Cinderpath expand).
 * Layout decls live in the parser; this module applies chrome at ingest / resolve.
 */

/**
 * @param {string | null | undefined} chrome
 * @param {string} body
 */
export function composeLayoutChromeHtml(chrome, body) {
  if (!chrome) return body;
  return `${chrome}${body}`;
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
