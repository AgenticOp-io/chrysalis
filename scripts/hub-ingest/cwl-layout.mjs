/**
 * CWL layout chrome wrap (RFC-0029 / Cinderpath expand).
 * Layout decls live in the parser; this module applies chrome at ingest / resolve.
 */

/** Slot in a document shell. Absent marker keeps RFC-0029 prefix concatenation. */
const CWL_HTML_BODY_SLOT = "<!-- cwl:body -->";
/** Per-page head fragment (title, meta). Replaced once. */
const CWL_HTML_HEAD_SLOT = "<!-- cwl:head -->";
/** Nav id when `nav` is set, otherwise the page decl name. */
const CWL_HTML_PAGE_SLOT = "<!-- cwl:page -->";
/** Host calendar year. CWL leaves this token in the document and does not read the clock. */
const CWL_HTML_YEAR_SLOT = "<!-- cwl:year -->";
/** `<!-- cwl:active <navId> <classToken> -->` becomes ` <classToken>` on that nav id only. */
const CWL_HTML_ACTIVE_RE = /<!-- cwl:active\s+([A-Za-z][A-Za-z0-9_-]*)\s+([A-Za-z][A-Za-z0-9_-]*)\s*-->/g;
/** Host device class. CWL leaves this token and does not read the viewport or the user agent. */
const CWL_HTML_DEVICE_SLOT = "<!-- cwl:device -->";
/**
 * Two tokens: default link list, base class, active class.
 * Three tokens: named list, base class, active class.
 */
const CWL_HTML_LINKS_RE =
  /<!-- cwl:links\s+([A-Za-z][A-Za-z0-9_-]*)\s+([A-Za-z][A-Za-z0-9_-]*)(?:\s+([A-Za-z][A-Za-z0-9_-]*))?\s*-->/g;

/**
 * @param {string} value
 */
function escapeCwlHtmlText(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {string} chrome
 * @param {Array<{ id: string, href: string, label: string, className?: string }>} links
 * @param {string} navId
 */
function expandCwlLinks(chrome, links, navId) {
  const items = Array.isArray(links) ? links : [];
  if (!items.length) return chrome;
  return chrome.replace(CWL_HTML_LINKS_RE, (_m, a, b, c) => {
    const grouped = Boolean(c);
    const group = grouped ? a : "";
    const baseClass = grouped ? b : a;
    const activeClass = grouped ? c : b;
    return items
      .filter((item) => (item.group || "") === group)
      .map((item) => {
        const cls = item.className || baseClass;
        const active = item.id === navId ? ` ${activeClass}` : "";
        const target = item.target === "blank" ? ` target="_blank"` : "";
        const rel = item.rel ? ` rel="${escapeCwlHtmlText(item.rel)}"` : "";
        return `<a class="${cls}${active}" href="${escapeCwlHtmlText(item.href)}"${target}${rel}>${escapeCwlHtmlText(item.label)}</a>`;
      })
      .join("");
  });
}

/**
 * Bounded drawer behavior. No viewport read and no user-agent read.
 * @param {{ navId: string, toggleClass: string, openClass: string, panelId?: string }} drawer
 */
function drawerBehaviorScript(drawer) {
  const nav = JSON.stringify(drawer.navId);
  const toggle = JSON.stringify(`.${drawer.toggleClass}`);
  const openClass = JSON.stringify(drawer.openClass);
  const panel = drawer.panelId ? `document.getElementById(${JSON.stringify(drawer.panelId)})` : "null";
  return `<script data-cwl-drawer="1">(function(){var nav=document.getElementById(${nav});var toggle=nav&&nav.querySelector(${toggle});var panel=${panel};if(!nav||!toggle)return;function setOpen(open){nav.classList.toggle(${openClass},open);toggle.setAttribute("aria-expanded",open?"true":"false");if(panel)panel.setAttribute("aria-hidden",open?"false":"true");}toggle.addEventListener("click",function(){setOpen(!nav.classList.contains(${openClass}));});nav.addEventListener("click",function(e){var t=e.target;if(t&&t.closest&&t.closest("a"))setOpen(false);});document.addEventListener("keydown",function(e){if(e.key==="Escape")setOpen(false);});})();</script>`;
}

/**
 * @param {string} chrome
 * @param {{ navId: string, toggleClass: string, openClass: string, panelId?: string }} drawer
 */
export function chromeHasDrawerTargets(chrome, drawer) {
  const text = String(chrome ?? "");
  if (!text.includes(`id="${drawer.navId}"`) && !text.includes(`id='${drawer.navId}'`)) return false;
  if (!text.includes(drawer.toggleClass)) return false;
  if (drawer.panelId && !text.includes(`id="${drawer.panelId}"`) && !text.includes(`id='${drawer.panelId}'`)) return false;
  return true;
}

/**
 * @param {string} html
 * @param {{ navId: string, toggleClass: string, openClass: string, panelId?: string }} drawer
 */
function insertDrawerScript(html, drawer) {
  if (html.includes("data-cwl-drawer=")) return html;
  const script = drawerBehaviorScript(drawer);
  const idx = html.lastIndexOf("</body>");
  if (idx >= 0) return `${html.slice(0, idx)}${script}${html.slice(idx)}`;
  return `${html}${script}`;
}

/**
 * Markers are resolved in the shell before head and body are inserted.
 * A declared nav id is shared by header and footer. Absent nav id uses the page name.
 * @param {string} chrome
 * @param {string} pageName
 * @param {string} [navId]
 */
function applyCwlPageMarkers(chrome, pageName, navId) {
  const name = String(navId || pageName || "");
  const withPage = chrome.split(CWL_HTML_PAGE_SLOT).join(name);
  return withPage.replace(CWL_HTML_ACTIVE_RE, (_m, page, token) => (page === name ? ` ${token}` : ""));
}

/**
 * @param {string | null | undefined} chrome
 * @param {string} body
 * @param {{ head?: string, pageName?: string, navId?: string, links?: object[], drawer?: object }} [opts]
 */
export function composeLayoutChromeHtml(chrome, body, opts = {}) {
  if (!chrome) return body;
  const head = String(opts.head ?? "");
  const navName = String(opts.navId || opts.pageName || "");
  let shell = applyCwlPageMarkers(chrome, opts.pageName ?? "", opts.navId ?? "");
  shell = expandCwlLinks(shell, opts.links, navName);
  if (shell.includes(CWL_HTML_HEAD_SLOT)) shell = shell.replace(CWL_HTML_HEAD_SLOT, head);
  let html = shell.includes(CWL_HTML_BODY_SLOT) ? shell.replace(CWL_HTML_BODY_SLOT, body) : `${shell}${body}`;
  html = expandCwlAssets(html, opts.styles, opts.images);
  html = expandCwlScripts(html, opts.scripts);
  html = expandCwlForms(html, opts.forms);
  if (opts.hostFirebase) html = insertHostNote(html, opts.hostFirebase);
  if (opts.drawer && chromeHasDrawerTargets(html, opts.drawer)) html = insertDrawerScript(html, opts.drawer);
  return html;
}

/**
 * Stylesheet and image markers. CWL names the files. It does not parse CSS or image bytes.
 * @param {string} html
 * @param {string[] | undefined} styles
 * @param {Array<{ id: string, path: string }> | undefined} images
 */
function expandCwlAssets(html, styles, images) {
  let out = String(html);
  const sheets = Array.isArray(styles) ? styles : [];
  if (sheets.length && out.includes("<!-- cwl:style -->")) {
    const tags = sheets
      .map((href) => `<link rel="stylesheet" href="${escapeCwlHtmlText(href)}" />`)
      .join("");
    out = out.split("<!-- cwl:style -->").join(tags);
  }
  for (const image of images ?? []) {
    const token = `<!-- cwl:image ${image.id} -->`;
    if (!out.includes(token)) continue;
    out = out.split(token).join(escapeCwlHtmlText(image.path));
  }
  return out;
}

/**
 * @param {string} html
 * @param {{ target: string, publicDir: string, errorDoc?: string }} host
 */
function insertHostNote(html, host) {
  if (html.includes("cwl-host ")) return html;
  const error = host.errorDoc ? ` error="${escapeCwlHtmlText(host.errorDoc)}"` : "";
  const note = `<!-- cwl-host firebase="${escapeCwlHtmlText(host.target)}" public="${escapeCwlHtmlText(host.publicDir)}"${error} -->`;
  const head = html.indexOf("<head>");
  if (head >= 0) {
    const at = head + "<head>".length;
    return `${html.slice(0, at)}${note}${html.slice(at)}`;
  }
  const body = html.lastIndexOf("</body>");
  if (body >= 0) return `${html.slice(0, body)}${note}${html.slice(body)}`;
  return `${note}${html}`;
}

/**
 * Script URL markers. CWL names the file. It does not parse or run it.
 * @param {string} html
 * @param {string[] | undefined} scripts
 */
function expandCwlScripts(html, scripts) {
  const files = Array.isArray(scripts) ? scripts : [];
  if (!files.length || !String(html).includes("<!-- cwl:script -->")) return html;
  const tags = files.map((src) => `<script src="${escapeCwlHtmlText(src)}" defer></script>`).join("");
  return String(html).split("<!-- cwl:script -->").join(tags);
}

/**
 * Same-site forms. Refused off-site actions are not written.
 * @param {string} html
 * @param {Array<{ id: string, method: string, action: string, fields: Array<{ name: string, type: string }>, submit?: string, refused?: boolean }> | undefined} forms
 */
function expandCwlForms(html, forms) {
  let out = String(html);
  for (const form of forms ?? []) {
    if (form.refused) continue;
    const token = `<!-- cwl:form ${form.id} -->`;
    if (!out.includes(token)) continue;
    const fields = (form.fields ?? [])
      .map((field) => `<input name="${escapeCwlHtmlText(field.name)}" type="${escapeCwlHtmlText(field.type)}" />`)
      .join("");
    const submit = form.submit ? `<button type="submit">${escapeCwlHtmlText(form.submit)}</button>` : "";
    const tag = `<form method="${form.method}" action="${escapeCwlHtmlText(form.action)}">${fields}${submit}</form>`;
    out = out.split(token).join(tag);
  }
  return out;
}

/** @param {string} surface */
export function surfaceHasScriptSlot(surface) {
  return String(surface ?? "").includes("<!-- cwl:script -->");
}

/**
 * @param {string} surface
 * @param {string} id
 */
export function surfaceHasFormSlot(surface, id) {
  return String(surface ?? "").includes(`<!-- cwl:form ${id} -->`);
}

/** @param {string} surface */
export function surfaceHasStyleSlot(surface) {
  return String(surface ?? "").includes("<!-- cwl:style -->");
}

/**
 * @param {string} surface
 * @param {string} id
 */
export function surfaceHasImageSlot(surface, id) {
  return String(surface ?? "").includes(`<!-- cwl:image ${id} -->`);
}

/** True when a declared head has nowhere to sit in the shell. */
export function chromeHasHeadSlot(chrome) {
  return String(chrome ?? "").includes(CWL_HTML_HEAD_SLOT);
}

/** True when the shell names the host year token. */
export function chromeHasYearSlot(chrome) {
  return String(chrome ?? "").includes(CWL_HTML_YEAR_SLOT);
}

/** True when the shell has at least one shared link-list slot. */
export function chromeHasLinksSlot(chrome) {
  return /<!-- cwl:links\s+/.test(String(chrome ?? ""));
}

/**
 * True when every link group has a matching slot.
 * Ungrouped rows need a two-token marker. Named rows need `<!-- cwl:links <group> `.
 * @param {string | null | undefined} chrome
 * @param {Array<{ group?: string }>} links
 */
export function chromeHasLinkGroups(chrome, links) {
  const text = String(chrome ?? "");
  const groups = new Set((links ?? []).map((link) => link.group || ""));
  for (const group of groups) {
    if (!group) {
      if (!/<!-- cwl:links\s+[A-Za-z][A-Za-z0-9_-]*\s+[A-Za-z][A-Za-z0-9_-]*\s*-->/.test(text)) return false;
    } else if (!text.includes(`<!-- cwl:links ${group} `)) return false;
  }
  return true;
}

/** True when the shell names the host device token. */
export function chromeHasDeviceSlot(chrome) {
  return String(chrome ?? "").includes(CWL_HTML_DEVICE_SLOT);
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
  if (layout.yearHost) route.yearHost = true;
  if (layout.deviceHost) route.deviceHost = layout.deviceHost;
  if (layout.drawer) route.drawer = layout.drawer;
  if (Array.isArray(layout.styles) && layout.styles.length) route.styles = layout.styles.slice();
  if (Array.isArray(layout.images) && layout.images.length) route.images = layout.images.slice();
  if (layout.hostFirebase) route.hostFirebase = layout.hostFirebase;
  if (Array.isArray(layout.scripts) && layout.scripts.length) route.scripts = layout.scripts.slice();
  if (Array.isArray(layout.forms) && layout.forms.length) route.forms = layout.forms.map((form) => ({ ...form, fields: form.fields.slice() }));
  for (const hole of layout.formHoles ?? []) {
    if (!route.attachmentHoles.includes(hole)) {
      route.attachmentHoles.push(hole);
      route.attachmentHoleLines.push(route.line ?? 1);
      route.attachmentHoleCharacters.push(0);
      route.attachmentHoleEndCharacters.push(4);
    }
  }
  if (Array.isArray(layout.links) && layout.links.length) route.navLinks = layout.links.slice();
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
