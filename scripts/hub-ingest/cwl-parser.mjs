/**
 * Chrysalis Web Language (CWL) parser — direct surface syntax for WebIR routes.
 * @see docs/CWL.md
 */
import { extractPathParamsFromCwlPath } from "./hub-cwl-path-params.mjs";
import { parseCwlStandaloneIslandBlock, parseCwlUiReturnBlock } from "./cwl-ui-tree.mjs";
import { CWL_DB_ENGINES, finalizeCwlDbModule, parseCwlDbStatement, parseCwlTableBlock } from "./cwl-db.mjs";
import { formatSessionCookieAttrs, parseAuthRequireEffect, parseCacheMaxAgeEffect, parseCacheNoCacheEffect, parseCacheNoStoreEffect, parseCachePrivateEffect, parseCookieDecl, parseCorsAllowEffect, parseCsrfVerifyEffect, parseDbEffect, parseIoEffect, parseJobEnqueueEffect, parseMailSendEffect, parseRateLimitEffect, parseSessionAccessEffect, parseSessionCookieEffect, redirectStatusAllowed, sameOriginRedirectPath, sessionCookieTrackingAbuse } from "./hub-cwl-effects.mjs";

const COMPONENT_DECL_RE = /^@component\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{/;
const PROP_RE = /^prop\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*;$/;

const ROUTE_RE = /^@route\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+"([^"]+)"/i;
const PAGE_RE = /^@page\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+"([^"]+)"/i;
const PAGE_BLOCK_RE = /^page\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\{/;
const HTML_RETURN_RE = /^return\s+html\s+(.+);$/i;
const UI_RETURN_RE = /^return\s+ui\s*\{/;
const LOAD_RE = /^load\s+(.+);$/i;
const MODULE_RE = /^module\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*;/;
const IMPORT_RE = /^import\s+"([^"]+)"\s*;/;
const HANDLER_RE = /^handler\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\{/;
const EFFECTS_RE = /^effects:\s*(.+);/;
const RETURN_RE = /^return\s+(.+);/;
const HOLE_RE = /^hole\s+([a-zA-Z0-9_:.-]+)(?:\s+"([^"]*)")?\s*;/;
const USE_PRESET_RE = /^use\s+(json|urlencoded)\s*;$/i;
const USE_AUTH_RE = /^use\s+auth\s+(session|bearer)\s*;$/i;
const PARAM_RE = /^param\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:=\s*(.+?))?\s*;$/;
const QUERY_RE = /^query\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:=\s*(.+?))?\s*;$/;
const HEADER_RE = /^header\s+([A-Za-z][A-Za-z0-9_-]*)\s*;$/;
const COOKIE_RE = /^cookie\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*;$/;
const BODY_RE = /^body\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*;$/;
/** RFC-0026: multipart field/file part bindings (not invent upload middleware). */
const MULTIPART_FIELD_RE = /^multipart\s+field\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*;$/;
const MULTIPART_FILE_RE = /^multipart\s+file\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*;$/;
const STATUS_RE = /^status\s+(\d{3})\s*;$/;
const CONTENT_TYPE_RE = /^content-type\s+(.+?)\s*;$/i;
/** RFC-0027: single-shot SSE surface (not EventSource runtime invent). */
const STREAM_SSE_RE = /^stream\s+sse\s*;$/i;
/** RFC-0035: WebSocket duplex surface (host owns the upgrade bytes). */
const STREAM_WEBSOCKET_RE = /^stream\s+websocket\s*;$/i;
const RESPONSE_HEADER_RE = /^response-header\s+([A-Za-z][A-Za-z0-9_-]*)\s*(?:=\s*(.+?))?\s*;$/;
const IF_GUARD_RE = /^if\s+(.+?)\s*\{$/;
const ELSE_IF_RE = /^else\s+if\s+(.+?)\s*\{$/;
const ELSE_RE = /^else\s*\{$/;
const FOREACH_RE = /^foreach\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+as(?:\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=>)?\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\{$/;
/** RFC-0031: repeat a markup fragment per item of a load collection (optional `if` filter). */
const HTML_REPEAT_RE =
  /^repeat\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s+as\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\s+if\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*))?\s+html\s+(.+);$/i;
/** Split `html "…" else html "…"` — first literal may not contain the else keyword as markup. */
const HTML_REPEAT_ELSE_SPLIT_RE = /^(.+?)\s+else\s+html\s+(.+)$/i;
/** RFC-0033: route forwards to a named upstream (host owns the bytes). */
const PROXY_UPSTREAM_RE = /^proxy\s+upstream\s+(.+);$/i;
/** RFC-0029: shared chrome layout */
const LAYOUT_DECL_RE = /^layout\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\{/;
const LAYOUT_USE_RE = /^layout\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*;$/;
const NAV_ID_RE = /^nav\s+([A-Za-z_][A-Za-z0-9_]*)\s*;$/;
/** Shared nav row. Optional class, target blank, and rel. */
const LINK_RE =
  /^link\s+([A-Za-z_][A-Za-z0-9_]*)\s+"([^"]*)"\s+"([^"]*)"(?:\s+class\s+([A-Za-z][A-Za-z0-9_-]*))?(?:\s+target\s+(blank))?(?:\s+rel\s+([A-Za-z][A-Za-z0-9_-]*))?\s*;$/;
/** Following `link` rows belong to this named list until the next `links` statement. */
const LINKS_GROUP_RE = /^links\s+([A-Za-z_][A-Za-z0-9_]*)\s*;$/;
/** Host device classes. Optional `below <px>` names the viewport cut. CWL does not read it. */
const DEVICE_HOST_RE =
  /^device\s+host\s+([A-Za-z][A-Za-z0-9_-]*)\s+([A-Za-z][A-Za-z0-9_-]*)(?:\s+below\s+([1-9]\d{1,3}))?\s*;$/;
/** Menu drawer. The host document gets the bounded toggle script. */
const DRAWER_RE =
  /^drawer\s+([A-Za-z][A-Za-z0-9_-]*)\s+toggle\s+([A-Za-z][A-Za-z0-9_-]*)\s+class\s+([A-Za-z][A-Za-z0-9_-]*)(?:\s+panel\s+([A-Za-z][A-Za-z0-9_-]*))?\s*;$/;
/** Image URL by id. The bytes stay on the host. */
const IMAGE_RE = /^image\s+([A-Za-z_][A-Za-z0-9_]*)\s+"([^"]+)"\s*;$/;
/** Firebase Hosting target. CWL does not deploy. */
const HOST_FIREBASE_RE =
  /^host\s+firebase\s+"([^"]+)"\s+public\s+"([^"]+)"(?:\s+error\s+"([^"]*)")?\s*;$/;
/** RFC-0040: script / style asset heads (integrity / module / crossorigin are optional). */
const SCRIPT_HEAD_RE = /^script\s+"((?:\\.|[^"\\])*)"(.*);$/;
const STYLE_HEAD_RE = /^style\s+"((?:\\.|[^"\\])*)"(.*);$/;
const SRI_RE = /^sha(256|384|512)-[A-Za-z0-9+/=]+$/;
/** Same-site form. Off-site actions are refused. Optional `enctype multipart` (RFC-0041). */
const FORM_RE =
  /^form\s+([A-Za-z_][A-Za-z0-9_]*)\s+method\s+(get|post)\s+action\s+"([^"]+)"(?:\s+enctype\s+(multipart))?\s*;$/;
/** Input on the current form. */
const FIELD_RE = /^field\s+([A-Za-z_][A-Za-z0-9_]*)\s+"([^"]+)"\s*;$/;
/** Submit label on the current form. */
const SUBMIT_RE = /^submit\s+"([^"]+)"\s*;$/;
/** Document charset. Only utf-8. The bytes stay a document fact. */
const CHARSET_RE = /^charset\s+utf-8\s*;$/;
/** HTML viewport meta. CWL writes the standard content and does not evaluate it. */
const VIEWPORT_RE = /^viewport\s+device\s*;$/;
const TITLE_RE = /^title\s+"((?:\\.|[^"\\])*)"\s*;$/;
const DESCRIPTION_RE = /^description\s+"((?:\\.|[^"\\])*)"\s*;$/;
const CANONICAL_RE = /^canonical\s+"((?:\\.|[^"\\])*)"\s*;$/;
/** RFC-0039: this surface replaces a live URL (DNA identity). */
const REPLACES_RE = /^replaces\s+"((?:\\.|[^"\\])*)"\s*;$/;
/** RFC-0039: Rosetta peel provenance — stack + origin path. */
const FROM_PEEL_RE = /^from\s+peel\s+"((?:\\.|[^"\\])*)"\s+at\s+"((?:\\.|[^"\\])*)"\s*;$/;
/** RFC-0039: capability class (closed set; unknown → hole). */
const CAPABILITY_RE = /^capability\s+([a-zA-Z][a-zA-Z0-9_-]*)\s*;$/;
/** RFC-0039: progressive certificate — page is complete without a client island. */
const WORKS_WITHOUT_CLIENT_RE = /^works\s+without\s+client\s*;$/i;
/** RFC-0042: bind a promoted traffic DNA certificate (document fact). */
const DNA_CERTIFICATE_RE = /^dna\s+certificate\s+"((?:\\.|[^"\\])*)"\s*;$/;
/** RFC-0042: SRI digest of that certificate (host verifies; CWL does not invent hashes). */
const DNA_FINGERPRINT_RE = /^dna\s+fingerprint\s+"((?:\\.|[^"\\])*)"\s*;$/;
/** RFC-0042: path to a bank of known DNA certificates for proof. */
const DNA_BANK_RE = /^dna\s+bank\s+"((?:\\.|[^"\\])*)"\s*;$/;
/** RFC-0042: this genome expects Secure live-match against the bound DNA. */
const MATCH_LIVE_RE = /^match\s+live\s*;$/i;
const CWL_CAPABILITIES = new Set([
  "cookies",
  "network-same-origin",
  "network-cross-origin",
  "storage",
  "client",
]);
const PEEL_STACK_RE = /^[a-z][a-z0-9-]{0,63}$/;
const META_QUOTE = '"((?:\\\\.|[^"\\\\])*)"';
const META_ROBOTS_RE = new RegExp(`^meta\\s+robots\\s+${META_QUOTE}\\s*;$`);
const META_KEYWORDS_RE = new RegExp(`^meta\\s+keywords\\s+${META_QUOTE}\\s*;$`);
const ICON_RE = /^icon\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+(apple))?\s*;$/;
const PRECONNECT_RE = new RegExp(`^preconnect\\s+${META_QUOTE}(?:\\s+(crossorigin))?\\s*;$`);
const ALTERNATE_RE = new RegExp(`^alternate\\s+${META_QUOTE}\\s+${META_QUOTE}\\s+${META_QUOTE}\\s*;$`);
const JSONLD_LINE_RE = new RegExp(`^jsonld\\s+${META_QUOTE}\\s*;$`);
const META_AUTHOR_RE = new RegExp(`^meta\\s+author\\s+${META_QUOTE}\\s*;$`);
const META_THEME_RE = new RegExp(`^meta\\s+theme\\s+${META_QUOTE}\\s*;$`);
const META_OG_RE = new RegExp(`^meta\\s+og\\s+(type|site|locale|url|title|description|image)\\s+${META_QUOTE}\\s*;$`);
const META_TWITTER_RE = new RegExp(`^meta\\s+twitter\\s+(card|title|description|image)\\s+${META_QUOTE}\\s*;$`);
const OG_TYPES = new Set(["website", "article", "profile"]);
const TWITTER_CARDS = new Set(["summary", "summary_large_image", "app", "player"]);

/**
 * @param {string} raw
 */
function cwlQuoted(raw) {
  return JSON.parse(`"${raw}"`);
}

/**
 * A canonical href is an absolute http(s) URL or a same-site path.
 * @param {string} href
 */
function canonicalHrefOk(href) {
  if (href.startsWith("/") && !href.startsWith("//")) return true;
  return /^https?:\/\//.test(href);
}

/**
 * Named asset URL: same-site path or absolute http(s). javascript: and protocol-relative refuse.
 * @param {string} href
 */
function assetHrefOk(href) {
  if (!href || typeof href !== "string") return false;
  if (href.startsWith("/") && !href.startsWith("//")) return true;
  return /^https?:\/\//i.test(href);
}

/**
 * DNA certificate / bank path: same-site path, relative path, or absolute http(s).
 * @param {string} href
 */
function dnaArtifactPathOk(href) {
  if (!href || typeof href !== "string") return false;
  if (href.startsWith("/") && !href.startsWith("//")) return true;
  if (/^https?:\/\//i.test(href)) return true;
  if (href.includes("://") || href.startsWith("//")) return false;
  return /^[A-Za-z0-9_./@+-]+$/.test(href);
}

/**
 * @param {string} line
 * @returns {{ kind: "certificate"|"fingerprint"|"bank"|"matchLive", value?: string } | { hole: string } | null}
 */
function parseDnaBindingLine(line) {
  const cert = DNA_CERTIFICATE_RE.exec(line);
  if (cert) {
    const href = cwlQuoted(cert[1]);
    if (!dnaArtifactPathOk(href)) return { hole: "cwl:dna-certificate-not-url" };
    return { kind: "certificate", value: href };
  }
  const fp = DNA_FINGERPRINT_RE.exec(line);
  if (fp) {
    const digest = cwlQuoted(fp[1]);
    if (!SRI_RE.test(digest)) return { hole: "cwl:bad-dna-fingerprint" };
    return { kind: "fingerprint", value: digest };
  }
  const bank = DNA_BANK_RE.exec(line);
  if (bank) {
    const href = cwlQuoted(bank[1]);
    if (!dnaArtifactPathOk(href)) return { hole: "cwl:dna-bank-not-path" };
    return { kind: "bank", value: href };
  }
  if (MATCH_LIVE_RE.test(line)) return { kind: "matchLive" };
  return null;
}

/**
 * @param {string} rest trailing tokens after the quoted URL (no leading semicolon)
 * @param {{ allowModule?: boolean }} opts
 * @returns {{ ok: true, module?: boolean, integrity?: string, crossorigin?: boolean } | { ok: false, hole: string }}
 */
function parseAssetTail(rest, opts = {}) {
  let s = String(rest ?? "").trim();
  /** @type {{ ok: true, module?: boolean, integrity?: string, crossorigin?: boolean }} */
  const out = { ok: true };
  if (opts.allowModule && /^module(?:\s|$)/.test(s)) {
    out.module = true;
    s = s.slice("module".length).trim();
  }
  const integ = /^integrity\s+"((?:\\.|[^"\\])*)"(.*)$/.exec(s);
  if (integ) {
    const sri = cwlQuoted(integ[1]);
    if (!SRI_RE.test(sri)) return { ok: false, hole: "cwl:bad-integrity" };
    out.integrity = sri;
    s = String(integ[2] ?? "").trim();
  }
  if (s === "crossorigin") {
    out.crossorigin = true;
    s = "";
  }
  if (s) return { ok: false, hole: "cwl:bad-asset-tail" };
  return out;
}

/**
 * @param {string} line
 * @returns {{ ok: true, asset: { src: string, module?: boolean, integrity?: string, crossorigin?: boolean } } | { ok: false, hole: string } | null}
 */
function parseScriptAssetLine(line) {
  const m = SCRIPT_HEAD_RE.exec(line);
  if (!m) return null;
  const src = cwlQuoted(m[1]);
  if (!assetHrefOk(src)) return { ok: false, hole: "cwl:bad-asset-url" };
  const tail = parseAssetTail(m[2], { allowModule: true });
  if (!tail.ok) return { ok: false, hole: tail.hole };
  /** @type {{ src: string, module?: boolean, integrity?: string, crossorigin?: boolean }} */
  const asset = { src };
  if (tail.module) asset.module = true;
  if (tail.integrity) asset.integrity = tail.integrity;
  if (tail.crossorigin) asset.crossorigin = true;
  return { ok: true, asset };
}

/**
 * @param {string} line
 * @returns {{ ok: true, asset: { href: string, integrity?: string, crossorigin?: boolean } } | { ok: false, hole: string } | null}
 */
function parseStyleAssetLine(line) {
  const m = STYLE_HEAD_RE.exec(line);
  if (!m) return null;
  const href = cwlQuoted(m[1]);
  if (!assetHrefOk(href)) return { ok: false, hole: "cwl:bad-asset-url" };
  const tail = parseAssetTail(m[2], { allowModule: false });
  if (!tail.ok) return { ok: false, hole: tail.hole };
  /** @type {{ href: string, integrity?: string, crossorigin?: boolean }} */
  const asset = { href };
  if (tail.integrity) asset.integrity = tail.integrity;
  if (tail.crossorigin) asset.crossorigin = true;
  return { ok: true, asset };
}

/**
 * @returns {{ robots?: string, author?: string, theme?: string, og: Record<string, string>, twitter: Record<string, string> }}
 */
function emptyMetaCard() {
  return { og: {}, twitter: {} };
}

/**
 * @param {ReturnType<typeof emptyMetaCard>} card
 */
function metaCardHasFacts(card) {
  return Boolean(
    card?.robots || card?.author || card?.theme || card?.keywords || Object.keys(card?.og ?? {}).length || Object.keys(card?.twitter ?? {}).length,
  );
}

/**
 * Closed social-card vocabulary. Invalid values become holes and are not stored.
 * @param {string} line
 * @param {ReturnType<typeof emptyMetaCard>} card
 * @param {string[]} holes
 */
function applyMetaLine(line, card, holes) {
  const robots = META_ROBOTS_RE.exec(line);
  if (robots) {
    card.robots = cwlQuoted(robots[1]);
    return true;
  }
  const keywords = META_KEYWORDS_RE.exec(line);
  if (keywords) {
    card.keywords = cwlQuoted(keywords[1]);
    return true;
  }
  const author = META_AUTHOR_RE.exec(line);
  if (author) {
    card.author = cwlQuoted(author[1]);
    return true;
  }
  const theme = META_THEME_RE.exec(line);
  if (theme) {
    const value = cwlQuoted(theme[1]);
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) card.theme = value;
    else if (!holes.includes("cwl:meta-theme")) holes.push("cwl:meta-theme");
    return true;
  }
  const og = META_OG_RE.exec(line);
  if (og) {
    const key = og[1];
    const value = cwlQuoted(og[2]);
    if (key === "type" && !OG_TYPES.has(value)) {
      if (!holes.includes("cwl:meta-og-type")) holes.push("cwl:meta-og-type");
    } else if ((key === "url" || key === "image") && !canonicalHrefOk(value)) {
      if (!holes.includes("cwl:meta-not-url")) holes.push("cwl:meta-not-url");
    } else {
      card.og[key] = value;
    }
    return true;
  }
  const twitter = META_TWITTER_RE.exec(line);
  if (twitter) {
    const key = twitter[1];
    const value = cwlQuoted(twitter[2]);
    if (key === "card" && !TWITTER_CARDS.has(value)) {
      if (!holes.includes("cwl:meta-twitter-card")) holes.push("cwl:meta-twitter-card");
    } else if (key === "image" && !canonicalHrefOk(value)) {
      if (!holes.includes("cwl:meta-not-url")) holes.push("cwl:meta-not-url");
    } else {
      card.twitter[key] = value;
    }
    return true;
  }
  return false;
}
/** RFC-0041: `file` requires `enctype multipart` on the current form. */
const FIELD_TYPES = new Set(["text", "email", "password", "hidden", "search", "url", "tel", "number", "file"]);
const CLIENT_UI_START_RE = /^client\s+ui\b/;
const CHROME_HTML_PREFIX_RE = /^chrome\s+html\s+/i;

/**
 * 0-based column of the first non-whitespace on a raw source line.
 * Cheap site for anchored keywords (`module`, `@route`/`@page`, `hole`, …) after trim-match.
 * @param {string} rawLine
 * @returns {number}
 */
export function keywordStartCharacter0(rawLine) {
  const idx = String(rawLine ?? "").search(/\S/);
  return idx >= 0 ? idx : 0;
}

/**
 * 0-based end column (exclusive) of an anchored keyword on a raw source line.
 * @param {string} rawLine
 * @param {string | number} keyword keyword text, or length
 * @returns {number}
 */
export function keywordEndCharacter0(rawLine, keyword) {
  const start = keywordStartCharacter0(rawLine);
  const len = typeof keyword === "number" ? keyword : String(keyword).length;
  return start + Math.max(0, len);
}

/** @param {string} raw */
export function normalizeCwlContentType(raw) {
  let v = raw.trim();
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
  const t = v.toLowerCase();
  if (t === "json") return "application/json";
  if (t === "text") return "text/plain; charset=utf-8";
  if (t === "html") return "text/html; charset=utf-8";
  return v;
}

/**
 * Extract a CWL `return html "…";` string literal, tolerating `;` inside the
 * quoted HTML (e.g. `Seed &amp; env:`). Falls back to greedy line match.
 * @param {string} inner
 * @returns {string | null} the quoted literal including quotes, or null
 */
export function extractCwlHtmlReturnLiteral(inner) {
  const t = inner.trim();
  const prefix = /^return\s+html\s+/i.exec(t);
  if (!prefix) return null;
  const rest = t.slice(prefix[0].length).trim();
  if (!(rest.startsWith('"') || rest.startsWith("'"))) {
    const m = HTML_RETURN_RE.exec(t);
    return m?.[1]?.trim() ?? null;
  }
  const quote = rest[0];
  let i = 1;
  while (i < rest.length) {
    if (rest[i] === "\\" && i + 1 < rest.length) {
      i += 2;
      continue;
    }
    if (rest[i] === quote) {
      const lit = rest.slice(0, i + 1);
      const after = rest.slice(i + 1).trim();
      if (after === ";" || after.startsWith(";")) return lit;
      // Unescaped quote mid-string (corrupt prior emit) — keep scanning
    }
    i += 1;
  }
  const m = HTML_RETURN_RE.exec(t);
  return m?.[1]?.trim() ?? null;
}

/**
 * Extract `chrome html "…";` literal including quotes (RFC-0029).
 * @param {string} inner
 * @returns {string | null}
 */
export function extractCwlChromeHtmlLiteral(inner) {
  const t = String(inner ?? "").trim();
  if (!CHROME_HTML_PREFIX_RE.test(t)) return null;
  return extractCwlHtmlReturnLiteral(t.replace(CHROME_HTML_PREFIX_RE, "return html "));
}

/** Multi-line HTML opener. Content runs until a line that is only `""";`. */
const HTML_BLOCK_CLOSE_RE = /^"""\s*;\s*$/;

/**
 * Extract `head html "…";` literal including quotes (RFC-0029 deepen).
 * @param {string} inner
 * @returns {string | null}
 */
export function extractCwlHeadHtmlLiteral(inner) {
  const t = String(inner ?? "").trim();
  if (!/^head\s+html\s+/i.test(t)) return null;
  return extractCwlHtmlReturnLiteral(t.replace(/^head\s+html\s+/i, "return html "));
}

/**
 * @param {string} line
 * @returns {"return" | "chrome" | "head" | null}
 */
export function cwlHtmlBlockKind(line) {
  const t = String(line ?? "").trim();
  if (/^return\s+html\s+"""\s*$/i.test(t)) return "return";
  if (/^chrome\s+html\s+"""\s*$/i.test(t)) return "chrome";
  if (/^head\s+html\s+"""\s*$/i.test(t)) return "head";
  if (/^jsonld\s+"""\s*$/i.test(t)) return "jsonld";
  return null;
}

/**
 * Read raw HTML after an opener line. Newlines and quotes stay in the value.
 * @param {string[]} lines
 * @param {number} indexAfterOpen
 * @returns {{ ok: true, value: string, next: number } | { ok: false, value: "", next: number }}
 */
export function readCwlHtmlBlock(lines, indexAfterOpen) {
  /** @type {string[]} */
  const parts = [];
  let i = indexAfterOpen;
  while (i < lines.length) {
    if (HTML_BLOCK_CLOSE_RE.test(lines[i].trim())) {
      return { ok: true, value: parts.join("\n"), next: i + 1 };
    }
    parts.push(lines[i]);
    i += 1;
  }
  return { ok: false, value: "", next: lines.length };
}

/**
 * @param {string[]} lines
 * @param {number} startIdx
 * @param {number} lineNo
 */
function parseLayoutDeclBlock(lines, startIdx, lineNo) {
  const open = lines[startIdx].trim();
  const m = LAYOUT_DECL_RE.exec(open);
  if (!m) return { ok: false, error: "not-layout", consumed: startIdx + 1 };
  const name = m[1];
  /** @type {string[]} */
  const headers = [];
  /** @type {string[]} */
  const cookies = [];
  /** @type {Array<{ name: string, purpose: string, values: string[] | null }>} */
  const cookiePurposes = [];
  /** @type {string[]} */
  const holes = [];
  /** @type {string | null} */
  let chromeHtml = null;
  let yearHost = false;
  /** @type {number | null} */
  let yearLiteral = null;
  let charset = null;
  let viewportDevice = false;
  const metaCard = emptyMetaCard();
  /** @type {{ values: string[] } | null} */
  let deviceHost = null;
  /** @type {{ navId: string, toggleClass: string, openClass: string, panelId?: string } | null} */
  let drawer = null;
  /** @type {string} */
  let linkGroup = "";
  /** @type {Array<{ href: string, integrity?: string, crossorigin?: boolean }>} */
  const styles = [];
  /** @type {Array<{ id: string, path: string }>} */
  const images = [];
  /** @type {{ target: string, publicDir: string, errorDoc?: string } | null} */
  let hostFirebase = null;
  /** @type {Array<{ id: string, href: string, label: string, className?: string, group?: string, target?: string, rel?: string }>} */
  const links = [];
  /** @type {Array<{ src: string, module?: boolean, integrity?: string, crossorigin?: boolean }>} */
  const scripts = [];
  /** @type {Array<{ id: string, method: string, action: string, fields: Array<{ name: string, type: string }>, submit?: string, refused?: boolean }>} */
  const forms = [];
  /** @type {{ id: string, method: string, action: string, fields: Array<{ name: string, type: string }>, submit?: string, refused?: boolean } | null} */
  let currentForm = null;
  /** @type {string[]} Holes derived from form statements. Not reprinted as `hole` lines. */
  const formHoles = [];
  /** @type {object[]} */
  const pageIslands = [];
  let i = startIdx + 1;
  while (i < lines.length) {
    const line = lines[i].trim();
    i += 1;
    if (!line || line.startsWith("#") || line.startsWith("//")) continue;
    if (line === "}") {
      return {
        ok: true,
        layout: {
          name,
          line: lineNo,
          headers,
          cookies,
          cookiePurposes,
          holes,
          chromeHtml,
          pageIslands,
          ...(yearHost ? { yearHost: true } : {}),
          ...(yearLiteral != null ? { yearLiteral } : {}),
          ...(charset ? { charset } : {}),
          ...(viewportDevice ? { viewportDevice: true } : {}),
          ...(metaCardHasFacts(metaCard) ? { metaCard } : {}),
          ...(deviceHost ? { deviceHost } : {}),
          ...(drawer ? { drawer } : {}),
          ...(styles.length ? { styles } : {}),
          ...(images.length ? { images } : {}),
          ...(hostFirebase ? { hostFirebase } : {}),
          ...(scripts.length ? { scripts } : {}),
          ...(forms.length ? { forms } : {}),
          ...(formHoles.length ? { formHoles } : {}),
          ...(links.length ? { links } : {}),
        },
        consumed: i,
      };
    }
    const hm = HEADER_RE.exec(line);
    if (hm) {
      if (!headers.includes(hm[1])) headers.push(hm[1]);
      continue;
    }
    const cm = parseCookieDecl(line);
    if (cm) {
      if (cm.tracking || !cm.name) {
        if (!holes.includes("unsupported:tracking-cookie")) holes.push("unsupported:tracking-cookie");
        continue;
      }
      if (!cookies.includes(cm.name)) cookies.push(cm.name);
      cookiePurposes.push({ name: cm.name, purpose: cm.purpose, values: cm.values });
      continue;
    }
    if (/^year\s+host\s*;$/.test(line)) {
      yearHost = true;
      yearLiteral = null;
      continue;
    }
    const yearLit = /^year\s+(\d{4})\s*;$/.exec(line);
    if (yearLit) {
      const n = Number(yearLit[1]);
      if (n >= 1970 && n <= 9999) {
        yearLiteral = n;
        yearHost = false;
      }
      continue;
    }
    if (CHARSET_RE.test(line)) {
      charset = "utf-8";
      continue;
    }
    if (VIEWPORT_RE.test(line)) {
      viewportDevice = true;
      continue;
    }
    if (applyMetaLine(line, metaCard, holes)) continue;
    const device = DEVICE_HOST_RE.exec(line);
    if (device) {
      deviceHost = { values: [device[1], device[2]] };
      if (device[3]) deviceHost.below = Number(device[3]);
      continue;
    }
    const drawerLine = DRAWER_RE.exec(line);
    if (drawerLine) {
      drawer = { navId: drawerLine[1], toggleClass: drawerLine[2], openClass: drawerLine[3] };
      if (drawerLine[4]) drawer.panelId = drawerLine[4];
      continue;
    }
    const style = parseStyleAssetLine(line);
    if (style) {
      if (style.ok) styles.push(style.asset);
      else if (!holes.includes(style.hole)) holes.push(style.hole);
      continue;
    }
    const image = IMAGE_RE.exec(line);
    if (image) {
      images.push({ id: image[1], path: image[2] });
      continue;
    }
    const host = HOST_FIREBASE_RE.exec(line);
    if (host) {
      hostFirebase = { target: host[1], publicDir: host[2] };
      if (host[3]) hostFirebase.errorDoc = host[3];
      continue;
    }
    const script = parseScriptAssetLine(line);
    if (script) {
      if (script.ok) scripts.push(script.asset);
      else if (!holes.includes(script.hole)) holes.push(script.hole);
      continue;
    }
    const formLine = FORM_RE.exec(line);
    if (formLine) {
      const action = formLine[3];
      const method = formLine[2];
      const enctype = formLine[4] || null;
      const refused = !sameOriginRedirectPath(action);
      currentForm = { id: formLine[1], method, action, fields: [] };
      if (enctype === "multipart") {
        if (method === "get") {
          if (!formHoles.includes("cwl:multipart-not-get")) formHoles.push("cwl:multipart-not-get");
        } else {
          currentForm.enctype = "multipart";
        }
      }
      if (refused) {
        currentForm.refused = true;
        if (!formHoles.includes("unsupported:offsite-form")) formHoles.push("unsupported:offsite-form");
      }
      forms.push(currentForm);
      continue;
    }
    const field = FIELD_RE.exec(line);
    if (field) {
      if (!currentForm) {
        if (!formHoles.includes("cwl:orphan-field")) formHoles.push("cwl:orphan-field");
      } else if (!FIELD_TYPES.has(field[2])) {
        if (!formHoles.includes("cwl:unknown-field-type")) formHoles.push("cwl:unknown-field-type");
      } else if (field[2] === "file" && currentForm.enctype !== "multipart") {
        if (!formHoles.includes("cwl:file-needs-multipart")) formHoles.push("cwl:file-needs-multipart");
      } else {
        currentForm.fields.push({ name: field[1], type: field[2] });
      }
      continue;
    }
    const submit = SUBMIT_RE.exec(line);
    if (submit) {
      if (!currentForm) {
        if (!formHoles.includes("cwl:orphan-field")) formHoles.push("cwl:orphan-field");
      } else {
        currentForm.submit = submit[1];
      }
      continue;
    }
    const group = LINKS_GROUP_RE.exec(line);
    if (group) {
      linkGroup = group[1];
      continue;
    }
    const link = LINK_RE.exec(line);
    if (link) {
      const row = { id: link[1], href: link[2], label: link[3] };
      if (link[4]) row.className = link[4];
      if (link[5]) row.target = link[5];
      if (link[6]) row.rel = link[6];
      if (linkGroup) row.group = linkGroup;
      links.push(row);
      continue;
    }
    const hol = HOLE_RE.exec(line);
    if (hol) {
      holes.push(hol[1]);
      continue;
    }
    const chromeKind = cwlHtmlBlockKind(line);
    if (chromeKind === "chrome") {
      const block = readCwlHtmlBlock(lines, i);
      i = block.next;
      if (block.ok) chromeHtml = block.value;
      else if (!holes.includes("cwl:unclosed-html")) holes.push("cwl:unclosed-html");
      continue;
    }
    const chromeLit = extractCwlChromeHtmlLiteral(line);
    if (chromeLit !== null) {
      const lit = parseCwlLiteral(chromeLit);
      if (lit.ok && typeof lit.value === "string") chromeHtml = lit.value;
      continue;
    }
    if (CLIENT_UI_START_RE.test(line)) {
      const islandParsed = parseCwlStandaloneIslandBlock(lines, i - 1);
      if (islandParsed.ok) {
        pageIslands.push(islandParsed.island);
        i = islandParsed.consumed;
        continue;
      }
    }
    holes.push("cwl:unknown-layout-statement");
  }
  return { ok: false, error: "unclosed-layout", consumed: lines.length };
}

/**
 * @param {string} expr
 */
export function parseCwlLiteral(expr) {
  const t = expr.trim();
  if (t === "true") return { ok: true, value: true };
  if (t === "false") return { ok: true, value: false };
  if (t === "null") return { ok: true, value: null };
  if (/^-?\d+$/.test(t)) return { ok: true, value: Number(t) };
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return { ok: true, value: JSON.parse(t.startsWith('"') ? t : `"${t.slice(1, -1)}"`) };
  }
  if (t.startsWith("{") && t.endsWith("}")) {
    try {
      const normalized = t.replace(/([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '"$1":');
      return { ok: true, value: JSON.parse(normalized) };
    } catch {
      return { ok: false, error: "invalid-object-literal" };
    }
  }
  if (t.startsWith("[") && t.endsWith("]")) {
    try {
      const normalized = t.replace(/([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '"$1":');
      return { ok: true, value: JSON.parse(normalized) };
    } catch {
      return { ok: false, error: "invalid-array-literal" };
    }
  }
  return { ok: false, error: "unsupported-literal" };
}

/**
 * @param {string} expr
 * @param {{ path?: string[], query?: string[], header?: string[], cookie?: string[], body?: string[] }} bindings
 */
export function parseCwlReturnValue(expr, bindings = {}) {
  const pathBindings = bindings.path ?? (Array.isArray(bindings) ? bindings : []);
  const queryBindings = bindings.query ?? [];
  const headerBindings = bindings.header ?? [];
  const cookieBindings = bindings.cookie ?? [];
  const bodyBindings = bindings.body ?? [];
  const pathDefaults = bindings.pathDefaults ?? {};
  const queryDefaults = bindings.queryDefaults ?? {};
  const t = expr.trim();
  if (t.startsWith("{") && t.endsWith("}")) {
    const entries = parseCwlObjectEntries(t, {
      path: pathBindings,
      query: queryBindings,
      header: headerBindings,
      cookie: cookieBindings,
      body: bodyBindings,
      pathDefaults,
      queryDefaults,
    });
    if (!entries.ok) return { ok: false, error: entries.error };
    return { ok: true, body: { kind: "object", entries: entries.entries } };
  }
  const lit = parseCwlLiteral(t);
  if (lit.ok) return { ok: true, body: { kind: "literal", value: lit.value } };
  // Bare scalar return of a declared path/query binding (e.g. `return userId;`).
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(t)) {
    if (pathBindings.includes(t)) {
      const body = { kind: "pathParam", name: t };
      if (Object.prototype.hasOwnProperty.call(pathDefaults, t)) body.default = pathDefaults[t];
      return { ok: true, body };
    }
    if (queryBindings.includes(t)) {
      const body = { kind: "queryParam", name: t };
      if (Object.prototype.hasOwnProperty.call(queryDefaults, t)) body.default = queryDefaults[t];
      return { ok: true, body };
    }
  }
  return { ok: false, error: "unsupported-return" };
}

/**
 * Split comma-separated object fields respecting nested `{` `[` brackets and
 * string literals — prose values carry commas, and splitting inside a quoted
 * string produced pairs with no `:` and a bogus `invalid-object-pair`.
 * @param {string} inner
 */
function splitTopLevelObjectPairs(inner) {
  /** @type {string[]} */
  const pairs = [];
  let depth = 0;
  let start = 0;
  let quote = "";
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (quote) {
      if (c === "\\") i += 1;
      else if (c === quote) quote = "";
      continue;
    }
    if (c === '"' || c === "'") quote = c;
    else if (c === "{" || c === "[") depth += 1;
    else if (c === "}" || c === "]") depth -= 1;
    else if (c === "," && depth === 0) {
      const part = inner.slice(start, i).trim();
      if (part) pairs.push(part);
      start = i + 1;
    }
  }
  const tail = inner.slice(start).trim();
  if (tail) pairs.push(tail);
  return pairs;
}

/**
 * Parse a CWL array literal into structured elements (nested objects/arrays preserved).
 * @param {string} arrayExpr
 * @param {{ path: string[], query: string[], header: string[], cookie: string[], body: string[], pathDefaults?: object, queryDefaults?: object }} bindings
 */
function parseCwlArrayElements(arrayExpr, bindings) {
  const inner = arrayExpr.slice(1, -1).trim();
  if (!inner) return { ok: true, elements: [] };
  /** @type {Array<{ kind: string, value?: unknown, name?: string, entries?: object[], elements?: object[] }>} */
  const elements = [];
  for (const rawVal of splitTopLevelObjectPairs(inner)) {
    const parsed = parseCwlStructuredValue(rawVal, bindings);
    if (!parsed.ok) return { ok: false, error: parsed.error ?? "invalid-array-element" };
    elements.push(parsed.value);
  }
  return { ok: true, elements };
}

/**
 * Parse one object-field / array-element value without collapsing nested `{`/`[` to JSON.
 * @param {string} rawVal
 * @param {{ path: string[], query: string[], header: string[], cookie: string[], body: string[], pathDefaults?: object, queryDefaults?: object }} bindings
 */
function parseCwlStructuredValue(rawVal, bindings) {
  const t = rawVal.trim();
  if (t.startsWith("{") && t.endsWith("}")) {
    const nested = parseCwlObjectEntries(t, bindings);
    if (!nested.ok) return { ok: false, error: nested.error };
    return { ok: true, value: { kind: "object", entries: nested.entries } };
  }
  if (t.startsWith("[") && t.endsWith("]")) {
    const nested = parseCwlArrayElements(t, bindings);
    if (!nested.ok) return { ok: false, error: nested.error };
    return { ok: true, value: { kind: "array", elements: nested.elements } };
  }
  // Scalars only via parseCwlLiteral — reject object/array branches (handled above).
  if (!(t.startsWith("{") || t.startsWith("["))) {
    if (t === "true") return { ok: true, value: { kind: "literal", value: true } };
    if (t === "false") return { ok: true, value: { kind: "literal", value: false } };
    if (t === "null") return { ok: true, value: { kind: "literal", value: null } };
    if (/^-?\d+$/.test(t)) return { ok: true, value: { kind: "literal", value: Number(t) } };
    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
      const lit = parseCwlLiteral(t);
      if (lit.ok) return { ok: true, value: { kind: "literal", value: lit.value } };
    }
  }
  const cookieKw = /^cookie\s+([a-zA-Z_][a-zA-Z0-9_]*)$/.exec(t);
  if (cookieKw) {
    return { ok: true, value: { kind: "cookieParam", name: cookieKw[1] } };
  }
  if (bindings.header.includes(t)) {
    return { ok: true, value: { kind: "headerParam", name: t } };
  }
  if (bindings.cookie.includes(t)) {
    return { ok: true, value: { kind: "cookieParam", name: t } };
  }
  if (bindings.body.includes(t)) {
    return { ok: true, value: { kind: "bodyParam", name: t } };
  }
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(t)) {
    if (bindings.path.includes(t)) {
      const value = { kind: "pathParam", name: t };
      if (Object.prototype.hasOwnProperty.call(bindings.pathDefaults ?? {}, t)) {
        value.default = bindings.pathDefaults[t];
      }
      return { ok: true, value };
    }
    if (bindings.query.includes(t)) {
      const value = { kind: "queryParam", name: t };
      if (Object.prototype.hasOwnProperty.call(bindings.queryDefaults ?? {}, t)) {
        value.default = bindings.queryDefaults[t];
      }
      return { ok: true, value };
    }
  }
  return { ok: false, error: "unsupported-structured-value" };
}

function parseCwlObjectEntries(objectExpr, bindings) {
  const inner = objectExpr.slice(1, -1).trim();
  if (!inner) return { ok: true, entries: [] };
  /** @type {Array<{ key: string, value: { kind: string, value?: unknown, name?: string, entries?: object[], elements?: object[] } }>} */
  const entries = [];
  for (const pair of splitTopLevelObjectPairs(inner)) {
    const colon = pair.indexOf(":");
    if (colon < 0) return { ok: false, error: "invalid-object-pair" };
    const key = pair.slice(0, colon).trim();
    const rawVal = pair.slice(colon + 1).trim();
    const structured = parseCwlStructuredValue(rawVal, bindings);
    if (structured.ok) {
      entries.push({ key, value: structured.value });
      continue;
    }
    const lit = parseCwlLiteral(rawVal);
    if (lit.ok) {
      entries.push({ key, value: { kind: "literal", value: lit.value } });
      continue;
    }
    const cookieKw = /^cookie\s+([a-zA-Z_][a-zA-Z0-9_]*)$/.exec(rawVal);
    if (cookieKw) {
      entries.push({ key, value: { kind: "cookieParam", name: cookieKw[1] } });
      continue;
    }
    if (bindings.header.includes(rawVal)) {
      entries.push({ key, value: { kind: "headerParam", name: rawVal } });
      continue;
    }
    if (bindings.cookie.includes(rawVal)) {
      entries.push({ key, value: { kind: "cookieParam", name: rawVal } });
      continue;
    }
    if (bindings.body.includes(rawVal)) {
      entries.push({ key, value: { kind: "bodyParam", name: rawVal } });
      continue;
    }
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(rawVal)) {
      if (bindings.path.includes(rawVal)) {
        const value = { kind: "pathParam", name: rawVal };
        if (Object.prototype.hasOwnProperty.call(bindings.pathDefaults ?? {}, rawVal)) {
          value.default = bindings.pathDefaults[rawVal];
        }
        entries.push({ key, value });
        continue;
      }
      if (bindings.query.includes(rawVal)) {
        const value = { kind: "queryParam", name: rawVal };
        if (Object.prototype.hasOwnProperty.call(bindings.queryDefaults ?? {}, rawVal)) {
          value.default = bindings.queryDefaults[rawVal];
        }
        entries.push({ key, value });
        continue;
      }
    }
    return { ok: false, error: `invalid-object-field:${key}` };
  }
  if (entries.length === 0) return { ok: false, error: "empty-object-literal" };
  return { ok: true, entries };
}

/**
 * @param {string} effectsRaw
 * @returns {string[]}
 */
function parseEffects(effectsRaw) {
  const t = effectsRaw.trim().toLowerCase();
  if (t === "none" || t === "") return [];
  return t
    .split(",")
    .map((s) => normalizeEffectTag(s.trim()))
    .filter(Boolean);
}

/**
 * Normalize effect tags. RFC-0032 deepen: `session.mint cookie sid` keeps the
 * cookie **name** (never a value) so Secure can cross-check response surfaces.
 * Tip 1.0.43: optional policy attrs (`httponly`, `secure`, `path /`, `samesite lax|strict`).
 * Tip 1.0.56: `samesite none` is refused (`unsupported:tracking-cookie`).
 * @param {string} raw
 */
function normalizeEffectTag(raw) {
  if (!raw) return "";
  const session = parseSessionCookieEffect(raw);
  if (session) {
    if (!session.cookie) return session.kind;
    const attrPart = session.attrs ? ` ${formatSessionCookieAttrs(session.attrs)}` : "";
    return `${session.kind} cookie ${session.cookie}${attrPart}`;
  }
  // Invalid cookie-attr tail on mint/revoke — drop rather than invent policy.
  const broken = /^session\.(?:mint|revoke)\s+cookie\s+/i.test(raw);
  if (broken) return "";
  const cors = parseCorsAllowEffect(raw);
  if (cors) {
    /** @type {string[]} */
    const parts = ["cors.allow"];
    if (cors.origin !== "*") parts.push(`origin ${cors.origin}`);
    if (cors.methods && cors.methods.length) parts.push(`methods ${cors.methods.join(" ")}`);
    if (cors.credentials) parts.push("credentials");
    return parts.join(" ");
  }
  if (/^cors\.allow\b/i.test(raw)) return ""; // invalid origin/methods form — drop
  const rate = parseRateLimitEffect(raw);
  if (rate) {
    return rate.rpm == null ? "rate.limit" : `rate.limit rpm ${rate.rpm}`;
  }
  if (/^rate\.limit\b/i.test(raw)) return ""; // invalid budget form — drop
  const csrf = parseCsrfVerifyEffect(raw);
  if (csrf) {
    return csrf.cookie == null ? "csrf.verify" : `csrf.verify cookie ${csrf.cookie}`;
  }
  if (/^csrf\.verify\b/i.test(raw)) return ""; // invalid cookie form — drop
  const authReq = parseAuthRequireEffect(raw);
  if (authReq) {
    return authReq.cookie == null ? "auth.require" : `auth.require cookie ${authReq.cookie}`;
  }
  if (/^auth\.require\b/i.test(raw)) return ""; // invalid cookie form — drop
  const dbFx = parseDbEffect(raw);
  if (dbFx) {
    return dbFx.table == null ? dbFx.kind : `${dbFx.kind} table ${dbFx.table}`;
  }
  if (/^db\.(?:read|write)\b/i.test(raw)) return ""; // invalid table form — drop
  const mailFx = parseMailSendEffect(raw);
  if (mailFx) {
    return mailFx.template == null ? "mail.send" : `mail.send template ${mailFx.template}`;
  }
  if (/^mail\.send\b/i.test(raw)) return ""; // invalid template form — drop
  const jobFx = parseJobEnqueueEffect(raw);
  if (jobFx) {
    return jobFx.name == null ? "job.enqueue" : `job.enqueue name ${jobFx.name}`;
  }
  if (/^job\.enqueue\b/i.test(raw)) return ""; // invalid name form — drop
  const cacheFx = parseCacheMaxAgeEffect(raw);
  if (cacheFx) {
    return `cache.max-age ${cacheFx.seconds}`;
  }
  if (/^cache\.max-age\b/i.test(raw)) return ""; // invalid budget form — drop
  const ioFx = parseIoEffect(raw);
  if (ioFx) {
    return ioFx.host == null ? "io" : `io host ${ioFx.host}`;
  }
  if (/^io\b/i.test(raw)) return ""; // invalid host form — drop
  const access = parseSessionAccessEffect(raw);
  if (access) {
    return access.cookie == null ? access.kind : `${access.kind} cookie ${access.cookie}`;
  }
  if (/^session\.(?:read|write)\b/i.test(raw)) return ""; // invalid cookie form — drop
  if (parseCachePrivateEffect(raw)) return "cache.private";
  if (parseCacheNoStoreEffect(raw)) return "cache.no-store";
  if (/^cache\.no-store\b/i.test(raw)) return ""; // invalid form — drop
  if (parseCacheNoCacheEffect(raw)) return "cache.no-cache";
  if (/^cache\.no-cache\b/i.test(raw)) return ""; // invalid form — drop
  return raw;
}

/**
 * After an `if` block’s closing `}`, consume `else if` / `else` tails.
 * @param {string[]} lines
 * @param {number} i
 * @param {object} bindings
 * @param {string | null} [firstLine] same-line `} else…` remainder already consumed with the close
 * @returns {{ elseIfs: object[], elseStmts: object[] | null, elseStatus: number | null, elseBody: object | null, nextI: number }}
 */
function parseElseTail(lines, i, bindings, firstLine = null) {
  /** @type {object[]} */
  const elseIfs = [];
  /** @type {object[] | null} */
  let elseStmts = null;
  /** @type {number | null} */
  let elseStatus = null;
  /** @type {object | null} */
  let elseBody = null;
  /** @type {string | null} */
  let pending = firstLine;
  while (i < lines.length || pending) {
    const line = pending ?? lines[i].trim();
    const fromPending = pending != null;
    pending = null;
    const elseIf = ELSE_IF_RE.exec(line);
    if (elseIf) {
      if (!fromPending) i += 1;
      const nested = parseControlStmts(lines, i, bindings);
      i = nested.nextI;
      elseIfs.push({
        condExpr: elseIf[1].trim(),
        status: nested.status,
        body: nested.body,
        stmts: nested.stmts,
      });
      if (nested.trailingElse) pending = nested.trailingElse;
      continue;
    }
    const elseOnly = ELSE_RE.exec(line);
    if (elseOnly) {
      if (!fromPending) i += 1;
      const nested = parseControlStmts(lines, i, bindings);
      i = nested.nextI;
      elseStmts = nested.stmts;
      elseStatus = nested.status;
      elseBody = nested.body;
      break;
    }
    break;
  }
  return { elseIfs, elseStmts, elseStatus, elseBody, nextI: i };
}

/**
 * Parse a control-block stmt list until the matching `}` that closes the block
 * opened on the caller’s `if` / `foreach` header line.
 *
 * Captures nested `if` / `foreach` as stmt nodes (honest surface / round-trip).
 * Does not evaluate conditions or loop bodies — WebIR/Hono remain authority.
 *
 * @param {string[]} lines
 * @param {number} startI index of the first line inside the block
 * @param {{ path: string[], query: string[], header: string[], cookie: string[], body: string[], pathDefaults: Record<string, unknown>, queryDefaults: Record<string, unknown> }} bindings
 * @returns {{ stmts: object[], nextI: number, status: number | null, body: object | null, trailingElse?: string | null }}
 */
function parseControlStmts(lines, startI, bindings) {
  /** @type {object[]} */
  const stmts = [];
  /** @type {number | null} */
  let status = null;
  /** @type {object | null} */
  let body = null;
  let i = startI;
  let depth = 1;
  /** @type {string | null} */
  let trailingElse = null;
  while (i < lines.length && depth > 0) {
    const gline = lines[i].trim();
    i += 1;
    // Same-line `} else` / `} else if` — close this block and hand else to caller.
    const closeElse = /^\}\s+(else\b.*)$/.exec(gline);
    if (closeElse && depth === 1) {
      depth = 0;
      trailingElse = closeElse[1].trim();
      break;
    }
    if (depth === 1 && gline && gline !== "}") {
      const gsm = STATUS_RE.exec(gline);
      if (gsm) {
        status = Number(gsm[1]);
        stmts.push({ kind: "status", status });
        continue;
      }
      const gHtml = extractCwlHtmlReturnLiteral(gline);
      if (gHtml !== null) {
        const lit = parseCwlLiteral(gHtml);
        if (lit.ok && typeof lit.value === "string") {
          body = { kind: "html", value: lit.value };
          stmts.push({ kind: "return", body });
        }
        continue;
      }
      const gret = RETURN_RE.exec(gline);
      if (gret) {
        const parsed = parseCwlReturnValue(gret[1], bindings);
        if (parsed.ok) {
          body = parsed.body;
          stmts.push({ kind: "return", body: parsed.body });
        }
        continue;
      }
      const ifGuard = IF_GUARD_RE.exec(gline);
      if (ifGuard) {
        const nested = parseControlStmts(lines, i, bindings);
        i = nested.nextI;
        const tail = parseElseTail(lines, i, bindings, nested.trailingElse ?? null);
        i = tail.nextI;
        stmts.push({
          kind: "if",
          condExpr: ifGuard[1].trim(),
          status: nested.status,
          body: nested.body,
          stmts: nested.stmts,
          elseIfs: tail.elseIfs,
          elseStmts: tail.elseStmts,
          elseStatus: tail.elseStatus,
          elseBody: tail.elseBody,
        });
        continue;
      }
      const foreachBind = FOREACH_RE.exec(gline);
      if (foreachBind) {
        const nested = parseControlStmts(lines, i, bindings);
        i = nested.nextI;
        stmts.push({
          kind: "foreach",
          collection: foreachBind[1],
          key: foreachBind[2] ?? null,
          item: foreachBind[3],
          body: nested.body,
          stmts: nested.stmts,
        });
        continue;
      }
    }
    if (gline.endsWith("{")) depth += 1;
    if (gline === "}") depth -= 1;
  }
  return { stmts, nextI: i, status, body, trailingElse };
}

/**
 * @param {string} source
 * @param {string} file
 */
export function parseCwlModule(source, file) {
  const lines = source.split(/\r?\n/);
  let moduleName = "main";
  /** @type {number | null} 1-based line of `module …;` when present */
  let moduleLine = null;
  /** @type {number | null} 0-based column of `module` keyword when present */
  let moduleCharacter = null;
  /** @type {number | null} 0-based exclusive end column of `module` keyword when present */
  let moduleEndCharacter = null;
  /** @type {Array<"express.json"|"express.urlencoded">} */
  const moduleUses = [];
  /** @type {Array<"chrysalis.auth.session"|"chrysalis.auth.bearer">} */
  const moduleAuthUses = [];
  /** @type {string[]} */
  const imports = [];
  /** @type {number[]} 1-based lines parallel to `imports` */
  const importLines = [];
  /** @type {Array<{ name: string, props: string[], tree: object, line: number }>} */
  const components = [];
  /** @type {Array<{ name: string, line: number, headers: string[], cookies: string[], holes: string[], chromeHtml: string | null, pageIslands: object[] }>} */
  const layouts = [];
  /** @type {Array<{ name: string, columns: { name: string, type: string, key: boolean }[], holes: string[] }>} */
  const tables = [];
  /** @type {string | null} */
  let engine = null;
  /** @type {string[]} */
  const engineHoles = [];
  /** @type {string | null} RFC-0042 module DNA certificate path/URL. */
  let dnaCertificate = null;
  /** @type {string | null} RFC-0042 module DNA fingerprint (SRI). */
  let dnaFingerprint = null;
  /** @type {string | null} RFC-0042 module DNA bank path. */
  let dnaBank = null;
  /** @type {boolean} RFC-0042 module expects live-match. */
  let matchLive = false;
  /** @type {string[]} */
  const dnaHoles = [];
  /** @type {Array<{ method: string, path: string, pathParams: string[], name: string, line: number, character?: number, endCharacter?: number, effects: string[], handlerPathParams: string[], handlerQueryParams: string[], handlerHeaders: string[], handlerCookies: string[], handlerBodyParams: string[], responseStatus: number | null, body: object }>} */
  const routes = [];
  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    const lineNo = i + 1;
    i += 1;
    if (!line || line.startsWith("#") || line.startsWith("//")) continue;
    const mod = MODULE_RE.exec(line);
    if (mod) {
      moduleName = mod[1];
      moduleLine = lineNo;
      moduleCharacter = keywordStartCharacter0(rawLine);
      moduleEndCharacter = keywordEndCharacter0(rawLine, "module");
      continue;
    }
    const dnaBind = parseDnaBindingLine(line);
    if (dnaBind) {
      if ("hole" in dnaBind) {
        if (!dnaHoles.includes(dnaBind.hole)) dnaHoles.push(dnaBind.hole);
      } else if (dnaBind.kind === "certificate") dnaCertificate = dnaBind.value ?? null;
      else if (dnaBind.kind === "fingerprint") dnaFingerprint = dnaBind.value ?? null;
      else if (dnaBind.kind === "bank") dnaBank = dnaBind.value ?? null;
      else if (dnaBind.kind === "matchLive") matchLive = true;
      continue;
    }
    const useM = USE_PRESET_RE.exec(line);
    if (useM) {
      moduleUses.push(useM[1].toLowerCase() === "json" ? "express.json" : "express.urlencoded");
      continue;
    }
    const authM = USE_AUTH_RE.exec(line);
    if (authM) {
      moduleAuthUses.push(
        authM[1].toLowerCase() === "session" ? "chrysalis.auth.session" : "chrysalis.auth.bearer",
      );
      continue;
    }
    const impM = IMPORT_RE.exec(line);
    if (impM) {
      imports.push(impM[1]);
      importLines.push(lineNo);
      continue;
    }
    const engineM = /^engine\s+([A-Za-z_][A-Za-z0-9_]*)\s*;$/i.exec(line);
    if (engineM) {
      const name = engineM[1].toLowerCase();
      if (!CWL_DB_ENGINES.includes(name)) engineHoles.push("cwl:unknown-db-engine");
      else if (engine && engine !== name) engineHoles.push("cwl:db-engine");
      else engine = name;
      continue;
    }
    const moduleHole = /^hole\s+([A-Za-z0-9_:.-]+)\s*;$/.exec(line);
    if (moduleHole) {
      engineHoles.push(moduleHole[1]);
      continue;
    }
    if (/^table\s+[A-Za-z_][A-Za-z0-9_]*\s*\{$/.test(line)) {
      const tableParsed = parseCwlTableBlock(lines, i - 1);
      if (tableParsed.table) tables.push(tableParsed.table);
      i = tableParsed.consumed;
      continue;
    }
    if (LAYOUT_DECL_RE.test(line)) {
      const layoutParsed = parseLayoutDeclBlock(lines, i - 1, lineNo);
      if (layoutParsed.ok) {
        layouts.push(layoutParsed.layout);
        i = layoutParsed.consumed;
      }
      continue;
    }
    const compDecl = COMPONENT_DECL_RE.exec(line);
    if (compDecl) {
      const compName = compDecl[1];
      /** @type {string[]} */
      const compProps = [];
      /** @type {object | null} */
      let compTree = null;
      while (i < lines.length) {
        const inner = lines[i].trim();
        i += 1;
        if (inner === "}") break;
        if (!inner || inner.startsWith("#") || inner.startsWith("//")) continue;
        const pr = PROP_RE.exec(inner);
        if (pr) {
          if (!compProps.includes(pr[1])) compProps.push(pr[1]);
          continue;
        }
        if (/^return\s+ui\s/.test(inner)) {
          const uiParsed = parseCwlUiReturnBlock(lines, i - 1);
          if (uiParsed.ok && uiParsed.tree) {
            compTree = uiParsed.tree;
            i = uiParsed.consumed;
          } else {
            compTree = { kind: "hole", reason: `cwl:${uiParsed.error ?? "invalid-component-ui"}` };
          }
          continue;
        }
        compTree = { kind: "hole", reason: "cwl:unknown-component-statement" };
      }
      if (compTree) components.push({ name: compName, props: compProps, tree: compTree, line: lineNo });
      continue;
    }
    /** @type {"api"|"page"} */
    let surfaceKind = "api";
    let rm = ROUTE_RE.exec(line);
    if (!rm) {
      rm = PAGE_RE.exec(line);
      if (rm) surfaceKind = "page";
    }
    if (!rm) continue;
    const method = rm[1].toUpperCase();
    const path = rm[2];
    const routeKeyword = surfaceKind === "page" ? "@page" : "@route";
    const routeCharacter = keywordStartCharacter0(rawLine);
    const routeEndCharacter = keywordEndCharacter0(rawLine, routeKeyword);
    if (i >= lines.length) break;
    const hline = lines[i].trim();
    const blockRe = surfaceKind === "page" ? PAGE_BLOCK_RE : HANDLER_RE;
    const hm = blockRe.exec(hline);
    if (!hm) continue;
    const name = hm[1];
    i += 1;
    const effects = [];
    const handlerPathParams = [];
    const handlerQueryParams = [];
    /** @type {Record<string, unknown>} */
    const handlerPathDefaults = {};
    /** @type {Record<string, unknown>} */
    const handlerQueryDefaults = {};
    const handlerHeaders = [];
    const handlerCookies = [];
    /** @type {Array<{ name: string, purpose: string, values: string[] | null }>} */
    const handlerCookiePurposes = [];
    const handlerBodyParams = [];
    /** @type {string[]} */
    const handlerMultipartFields = [];
    /** @type {string[]} */
    const handlerMultipartFiles = [];
    const bodyBindingsForReturn = () => [
      ...handlerBodyParams,
      ...handlerMultipartFields,
      ...handlerMultipartFiles,
    ];
    /** @type {Array<{ name: string, default?: unknown }>} */
    const responseHeaders = [];
    let responseStatus = null;
    /** @type {{ path: string, status: number } | null} */
    let redirect = null;
    let responseContentType = null;
    /** @type {string | null} */
    let streamKind = null;
    /** @type {object | null} */
    let loadBody = null;
    /** @type {Array<{ condExpr: string, status: number | null, body: object | null, stmts: object[] }>} */
    const earlyGuards = [];
    /** @type {Array<{ collection: string, key: string | null, item: string, body: object | null, stmts: object[] }>} */
    const foreachBindings = [];
    /** @type {string[]} Attachment / body hole reasons (RFC-0012/0024); kept when a later return sets body. */
    const attachmentHoles = [];
    /** @type {number[]} 1-based lines parallel to `attachmentHoles` (hole statement sites). */
    const attachmentHoleLines = [];
    /** @type {number[]} 0-based columns of `hole` keyword, parallel to `attachmentHoles`. */
    const attachmentHoleCharacters = [];
    /** @type {number[]} 0-based exclusive end columns of `hole` keyword, parallel to `attachmentHoles`. */
    const attachmentHoleEndCharacters = [];
    /** @type {Array<{ collection: string, item: string, template: string, line: number }>} RFC-0031 repeated markup */
    const htmlRepeats = [];
    /** @type {object[]} Bound row operations. The host runs them. */
    const dbOps = [];
    /** @type {string | null} RFC-0029 layout name */
    let layoutName = null;
    /** @type {string | null} Shared nav id (RFC-0029 deepen). Absent ⇒ page name. */
    let navId = null;
    /** @type {string | null} Per-page head fragment (RFC-0029 deepen) */
    let headHtml = null;
    /** @type {string | null} Document title. */
    let title = null;
    /** @type {string | null} Meta description. */
    let description = null;
    /** @type {string | null} Canonical href. Refused values are not stored. */
    let canonical = null;
    /** @type {string | null} RFC-0039 live URL this surface replaces. */
    let replaces = null;
    /** @type {{ stack: string, at: string } | null} RFC-0039 peel provenance. */
    let peel = null;
    /** @type {string[]} RFC-0039 capability classes. */
    const capabilities = [];
    /** @type {boolean} RFC-0039 progressive certificate. */
    let worksWithoutClient = false;
    /** @type {string | null} RFC-0042 per-surface DNA certificate. */
    let routeDnaCertificate = null;
    /** @type {string | null} RFC-0042 per-surface DNA fingerprint. */
    let routeDnaFingerprint = null;
    /** @type {boolean} RFC-0042 per-surface live-match intent. */
    let routeMatchLive = false;
    const metaCard = emptyMetaCard();
    /** @type {Array<{ href: string, integrity?: string, crossorigin?: boolean }>} Page stylesheets, after the layout styles. */
    const pageStyles = [];
    /** @type {Array<{ id: string, apple?: boolean }>} */
    const icons = [];
    /** @type {Array<{ href: string, crossorigin?: boolean }>} */
    const preconnects = [];
    /** @type {Array<{ type: string, href: string, title: string }>} */
    const alternates = [];
    /** @type {string[]} JSON-LD document text. Schema.org is not interpreted. */
    const jsonlds = [];
    /** @type {object[]} RFC-0030 page-level client islands (sibling to return html) */
    const pageIslands = [];
    let body = {
      kind: "hole",
      reason: "cwl:empty-handler",
      line: lineNo,
      character: routeCharacter,
      endCharacter: routeEndCharacter,
    };
    let sawReturn = false;
    const handlerBindings = () => ({
      path: handlerPathParams,
      query: handlerQueryParams,
      header: handlerHeaders,
      cookie: handlerCookies,
      body: bodyBindingsForReturn(),
      pathDefaults: handlerPathDefaults,
      queryDefaults: handlerQueryDefaults,
    });
    while (i < lines.length) {
      const inner = lines[i].trim();
      i += 1;
      if (inner === "}") break;
      if (!inner || inner.startsWith("#") || inner.startsWith("//")) continue;
      const layoutUse = LAYOUT_USE_RE.exec(inner);
      if (layoutUse) {
        layoutName = layoutUse[1];
        continue;
      }
      const navUse = NAV_ID_RE.exec(inner);
      if (navUse) {
        navId = navUse[1];
        continue;
      }
      const titleUse = TITLE_RE.exec(inner);
      if (titleUse) {
        title = cwlQuoted(titleUse[1]);
        continue;
      }
      const descriptionUse = DESCRIPTION_RE.exec(inner);
      if (descriptionUse) {
        description = cwlQuoted(descriptionUse[1]);
        continue;
      }
      const canonicalUse = CANONICAL_RE.exec(inner);
      if (canonicalUse) {
        const href = cwlQuoted(canonicalUse[1]);
        if (canonicalHrefOk(href)) canonical = href;
        else if (!attachmentHoles.includes("cwl:canonical-not-url")) attachmentHoles.push("cwl:canonical-not-url");
        continue;
      }
      const replacesUse = REPLACES_RE.exec(inner);
      if (replacesUse) {
        const href = cwlQuoted(replacesUse[1]);
        if (canonicalHrefOk(href)) replaces = href;
        else if (!attachmentHoles.includes("cwl:replaces-not-url")) attachmentHoles.push("cwl:replaces-not-url");
        continue;
      }
      const peelUse = FROM_PEEL_RE.exec(inner);
      if (peelUse) {
        const stack = cwlQuoted(peelUse[1]);
        const at = cwlQuoted(peelUse[2]);
        if (PEEL_STACK_RE.test(stack) && at.length > 0) peel = { stack, at };
        else if (!attachmentHoles.includes("cwl:peel-not-identity")) attachmentHoles.push("cwl:peel-not-identity");
        continue;
      }
      const capabilityUse = CAPABILITY_RE.exec(inner);
      if (capabilityUse) {
        const cap = capabilityUse[1].toLowerCase();
        if (CWL_CAPABILITIES.has(cap)) {
          if (!capabilities.includes(cap)) capabilities.push(cap);
        } else if (!attachmentHoles.includes("cwl:unknown-capability")) {
          attachmentHoles.push("cwl:unknown-capability");
        }
        continue;
      }
      if (WORKS_WITHOUT_CLIENT_RE.test(inner)) {
        worksWithoutClient = true;
        continue;
      }
      const routeDna = parseDnaBindingLine(inner);
      if (routeDna) {
        if ("hole" in routeDna) {
          if (!attachmentHoles.includes(routeDna.hole)) attachmentHoles.push(routeDna.hole);
        } else if (routeDna.kind === "certificate") routeDnaCertificate = routeDna.value ?? null;
        else if (routeDna.kind === "fingerprint") routeDnaFingerprint = routeDna.value ?? null;
        else if (routeDna.kind === "bank") {
          if (!attachmentHoles.includes("cwl:dna-bank-not-on-route")) {
            attachmentHoles.push("cwl:dna-bank-not-on-route");
          }
        } else if (routeDna.kind === "matchLive") routeMatchLive = true;
        continue;
      }
      if (applyMetaLine(inner, metaCard, attachmentHoles)) continue;
      const iconUse = ICON_RE.exec(inner);
      if (iconUse) {
        icons.push(iconUse[2] ? { id: iconUse[1], apple: true } : { id: iconUse[1] });
        continue;
      }
      const preconnectUse = PRECONNECT_RE.exec(inner);
      if (preconnectUse) {
        const href = cwlQuoted(preconnectUse[1]);
        if (canonicalHrefOk(href)) preconnects.push(preconnectUse[2] ? { href, crossorigin: true } : { href });
        else if (!attachmentHoles.includes("cwl:preconnect-not-url")) attachmentHoles.push("cwl:preconnect-not-url");
        continue;
      }
      const alternateUse = ALTERNATE_RE.exec(inner);
      if (alternateUse) {
        const type = cwlQuoted(alternateUse[1]);
        const href = cwlQuoted(alternateUse[2]);
        const label = cwlQuoted(alternateUse[3]);
        if (canonicalHrefOk(href)) alternates.push({ type, href, title: label });
        else if (!attachmentHoles.includes("cwl:alternate-not-url")) attachmentHoles.push("cwl:alternate-not-url");
        continue;
      }
      const pageStyle = parseStyleAssetLine(inner);
      if (pageStyle) {
        if (pageStyle.ok) pageStyles.push(pageStyle.asset);
        else if (!attachmentHoles.includes(pageStyle.hole)) attachmentHoles.push(pageStyle.hole);
        continue;
      }
      if (CLIENT_UI_START_RE.test(inner) && !UI_RETURN_RE.test(inner)) {
        const islandParsed = parseCwlStandaloneIslandBlock(lines, i - 1);
        if (islandParsed.ok) {
          pageIslands.push(islandParsed.island);
          i = islandParsed.consumed;
          continue;
        }
      }
      const pm = PARAM_RE.exec(inner);
      if (pm) {
        if (!handlerPathParams.includes(pm[1])) handlerPathParams.push(pm[1]);
        if (pm[2] !== undefined) {
          const lit = parseCwlLiteral(pm[2]);
          if (lit.ok) handlerPathDefaults[pm[1]] = lit.value;
        }
        continue;
      }
      const qm = QUERY_RE.exec(inner);
      if (qm) {
        if (!handlerQueryParams.includes(qm[1])) handlerQueryParams.push(qm[1]);
        if (qm[2] !== undefined) {
          const lit = parseCwlLiteral(qm[2]);
          if (lit.ok) handlerQueryDefaults[qm[1]] = lit.value;
        }
        continue;
      }
      const hmHeader = HEADER_RE.exec(inner);
      if (hmHeader) {
        if (!handlerHeaders.includes(hmHeader[1])) handlerHeaders.push(hmHeader[1]);
        continue;
      }
      const cm = parseCookieDecl(inner);
      if (cm) {
        if (cm.tracking || !cm.name || !cm.purpose) {
          if (!attachmentHoles.includes("unsupported:tracking-cookie")) {
            const holeRaw = lines[i - 1] ?? "";
            attachmentHoles.push("unsupported:tracking-cookie");
            attachmentHoleLines.push(i);
            attachmentHoleCharacters.push(keywordStartCharacter0(holeRaw));
            attachmentHoleEndCharacters.push(keywordEndCharacter0(holeRaw, "cookie"));
          }
          continue;
        }
        if (!handlerCookies.includes(cm.name)) handlerCookies.push(cm.name);
        handlerCookiePurposes.push({
          name: cm.name,
          purpose: cm.purpose,
          values: cm.values,
        });
        continue;
      }
      const bm = BODY_RE.exec(inner);
      if (bm) {
        if (!handlerBodyParams.includes(bm[1])) handlerBodyParams.push(bm[1]);
        continue;
      }
      const mpf = MULTIPART_FIELD_RE.exec(inner);
      if (mpf) {
        if (!handlerMultipartFields.includes(mpf[1])) handlerMultipartFields.push(mpf[1]);
        continue;
      }
      const mpfile = MULTIPART_FILE_RE.exec(inner);
      if (mpfile) {
        if (!handlerMultipartFiles.includes(mpfile[1])) handlerMultipartFiles.push(mpfile[1]);
        continue;
      }
      const sm = STATUS_RE.exec(inner);
      if (sm) {
        responseStatus = Number(sm[1]);
        continue;
      }
      if (/^redirect\b/i.test(inner)) {
        const rd = /^redirect\s+(\S+)(?:\s+status\s+(\d{3}))?\s*;$/i.exec(inner);
        const lit = rd ? parseCwlLiteral(rd[1]) : { ok: false, value: null };
        const status = rd?.[2] ? Number(rd[2]) : 302;
        const target = lit.ok && typeof lit.value === "string" ? lit.value : "";
        if (rd && sameOriginRedirectPath(target) && redirectStatusAllowed(status)) {
          redirect = { path: target, status };
        } else if (!attachmentHoles.includes("unsupported:open-redirect")) {
          const holeRaw = lines[i - 1] ?? "";
          attachmentHoles.push("unsupported:open-redirect");
          attachmentHoleLines.push(i);
          attachmentHoleCharacters.push(keywordStartCharacter0(holeRaw));
          attachmentHoleEndCharacters.push(keywordEndCharacter0(holeRaw, "redirect"));
        }
        continue;
      }
      const ctm = CONTENT_TYPE_RE.exec(inner);
      if (ctm) {
        responseContentType = normalizeCwlContentType(ctm[1] ?? "");
        continue;
      }
      if (STREAM_SSE_RE.test(inner)) {
        responseContentType = "text/event-stream";
        streamKind = "sse";
        continue;
      }
      if (STREAM_WEBSOCKET_RE.test(inner)) {
        streamKind = "websocket";
        continue;
      }
      const rhm = RESPONSE_HEADER_RE.exec(inner);
      if (rhm) {
        const rhName = rhm[1];
        if (!responseHeaders.some((h) => h.name === rhName)) {
          /** @type {{ name: string, default?: unknown }} */
          const entry = { name: rhName };
          if (rhm[2] !== undefined) {
            const lit = parseCwlLiteral(rhm[2]);
            if (lit.ok) entry.default = lit.value;
          }
          responseHeaders.push(entry);
        }
        continue;
      }
      const em = EFFECTS_RE.exec(inner);
      if (em) {
        const kept = [];
        for (const part of em[1].split(",")) {
          if (sessionCookieTrackingAbuse(part)) {
            if (!attachmentHoles.includes("unsupported:tracking-cookie")) {
              const holeRaw = lines[i - 1] ?? "";
              attachmentHoles.push("unsupported:tracking-cookie");
              attachmentHoleLines.push(i);
              attachmentHoleCharacters.push(keywordStartCharacter0(holeRaw));
              attachmentHoleEndCharacters.push(keywordEndCharacter0(holeRaw, "effects:"));
            }
            continue;
          }
          kept.push(part);
        }
        effects.push(...parseEffects(kept.join(",")));
        continue;
      }
      const jsonldLine = JSONLD_LINE_RE.exec(inner);
      if (jsonldLine) {
        const value = cwlQuoted(jsonldLine[1]);
        if (value.includes("</script>")) {
          if (!attachmentHoles.includes("cwl:jsonld-closes-script")) attachmentHoles.push("cwl:jsonld-closes-script");
        } else {
          try {
            JSON.parse(value);
            jsonlds.push(value);
          } catch {
            if (!attachmentHoles.includes("cwl:jsonld-not-json")) attachmentHoles.push("cwl:jsonld-not-json");
          }
        }
        continue;
      }
      const htmlBlock = cwlHtmlBlockKind(inner);
      if (htmlBlock === "jsonld") {
        const block = readCwlHtmlBlock(lines, i);
        i = block.next;
        if (!block.ok) {
          if (!attachmentHoles.includes("cwl:unclosed-html")) attachmentHoles.push("cwl:unclosed-html");
        } else {
          if (block.value.includes("</script>")) {
            if (!attachmentHoles.includes("cwl:jsonld-closes-script")) attachmentHoles.push("cwl:jsonld-closes-script");
          } else {
            try {
              JSON.parse(block.value);
              jsonlds.push(block.value);
            } catch {
              if (!attachmentHoles.includes("cwl:jsonld-not-json")) attachmentHoles.push("cwl:jsonld-not-json");
            }
          }
        }
        continue;
      }
      if (htmlBlock === "head") {
        const block = readCwlHtmlBlock(lines, i);
        i = block.next;
        if (block.ok) headHtml = block.value;
        else if (!attachmentHoles.includes("cwl:unclosed-html")) attachmentHoles.push("cwl:unclosed-html");
        continue;
      }
      const headLit = extractCwlHeadHtmlLiteral(inner);
      if (headLit !== null) {
        const lit = parseCwlLiteral(headLit);
        if (lit.ok && typeof lit.value === "string") headHtml = lit.value;
        else if (!attachmentHoles.includes("cwl:invalid-html-return")) attachmentHoles.push("cwl:invalid-html-return");
        continue;
      }
      if (htmlBlock === "return") {
        const block = readCwlHtmlBlock(lines, i);
        i = block.next;
        if (block.ok) {
          body = { kind: "html", value: block.value };
          if (!responseContentType) responseContentType = "text/html; charset=utf-8";
        } else {
          body = { kind: "hole", reason: "cwl:unclosed-html", line: i };
        }
        sawReturn = true;
        continue;
      }
      const htmlRetLit = extractCwlHtmlReturnLiteral(inner);
      if (htmlRetLit !== null) {
        const lit = parseCwlLiteral(htmlRetLit);
        if (lit.ok && typeof lit.value === "string") {
          body = { kind: "html", value: lit.value };
          if (!responseContentType) responseContentType = "text/html; charset=utf-8";
        } else {
          body = { kind: "hole", reason: "cwl:invalid-html-return", line: i };
        }
        sawReturn = true;
        continue;
      }
      if (UI_RETURN_RE.test(inner) || /^return\s+ui\s+[A-Za-z]/.test(inner)) {
        const uiParsed = parseCwlUiReturnBlock(lines, i - 1);
        if (uiParsed.ok) {
          if (uiParsed.componentRef) {
            body = { kind: "ui", componentRef: uiParsed.componentRef, props: uiParsed.props ?? [] };
          } else {
            body = { kind: "ui", tree: uiParsed.tree };
          }
          if (!responseContentType) responseContentType = "text/html; charset=utf-8";
          i = uiParsed.consumed;
        } else {
          body = { kind: "hole", reason: `cwl:${uiParsed.error ?? "invalid-ui-return"}`, line: i };
        }
        sawReturn = true;
        continue;
      }
      const dbStmt = parseCwlDbStatement(inner, {
        path: handlerPathParams,
        query: handlerQueryParams,
        body: bodyBindingsForReturn(),
      });
      if (dbStmt) {
        if (dbStmt.ok) dbOps.push(dbStmt.op);
        else {
          attachmentHoles.push(dbStmt.reason);
          attachmentHoleLines.push(i);
          attachmentHoleCharacters.push(0);
          attachmentHoleEndCharacters.push(4);
        }
        continue;
      }
      const loadM = LOAD_RE.exec(inner);
      if (loadM) {
        const parsed = parseCwlReturnValue(loadM[1], {
          path: handlerPathParams,
          query: handlerQueryParams,
          header: handlerHeaders,
          cookie: handlerCookies,
          body: bodyBindingsForReturn(),
          pathDefaults: handlerPathDefaults,
          queryDefaults: handlerQueryDefaults,
        });
        if (parsed.ok) loadBody = parsed.body;
        else loadBody = { kind: "hole", reason: `cwl:${parsed.error}` };
        continue;
      }
      // RFC-0033: declared upstream forward — the target is meaning, the bytes are the host's.
      const proxyM = PROXY_UPSTREAM_RE.exec(inner);
      if (proxyM) {
        const proxyRaw = lines[i - 1] ?? "";
        const targetLit = parseCwlLiteral(proxyM[1]);
        // A target may reuse the route's own path params — nothing else.
        const unknownParam = targetLit.ok
          ? extractPathParamsFromCwlPath(String(targetLit.value)).find(
              (p) => !extractPathParamsFromCwlPath(path).includes(p),
            )
          : null;
        const proxyHole = !targetLit.ok || typeof targetLit.value !== "string"
          ? "cwl:invalid-proxy-upstream"
          : unknownParam
            ? `cwl:unknown-proxy-param:${unknownParam}`
            : null;
        if (proxyHole) {
          attachmentHoles.push(proxyHole);
          attachmentHoleLines.push(i);
          attachmentHoleCharacters.push(keywordStartCharacter0(proxyRaw));
          attachmentHoleEndCharacters.push(keywordEndCharacter0(proxyRaw, "proxy"));
          body = {
            kind: "hole",
            reason: proxyHole,
            line: i,
            character: keywordStartCharacter0(proxyRaw),
            endCharacter: keywordEndCharacter0(proxyRaw, "proxy"),
          };
        } else {
          body = { kind: "proxy", target: String(targetLit.value) };
          sawReturn = true;
        }
        continue;
      }
      // RFC-0031: repeat markup per item of a collection binding (list fragments).
      const repeatM = HTML_REPEAT_RE.exec(inner);
      if (repeatM) {
        const collection = repeatM[1];
        const item = repeatM[2];
        const whenRaw = repeatM[3] ?? null;
        const tplRaw = repeatM[4];
        const elseSplit = HTML_REPEAT_ELSE_SPLIT_RE.exec(tplRaw);
        const mainTplRaw = elseSplit ? elseSplit[1] : tplRaw;
        const elseTplRaw = elseSplit ? elseSplit[2] : null;
        const tplLit = parseCwlLiteral(mainTplRaw);
        const elseLit = elseTplRaw ? parseCwlLiteral(elseTplRaw) : { ok: true, value: null };
        // Nested collections are one level only: `outerItem.field` (tip 1.0.41).
        const collectionDepth = collection.split(".").length;
        const collectionOk = collectionDepth >= 1 && collectionDepth <= 2;
        // `if` filter must be a field chain rooted on the item (`s.active`), never a free name.
        const whenOk =
          !whenRaw ||
          whenRaw === item ||
          whenRaw.startsWith(`${item}.`);
        if (
          tplLit.ok &&
          typeof tplLit.value === "string" &&
          whenOk &&
          collectionOk &&
          elseLit.ok &&
          (elseTplRaw == null || typeof elseLit.value === "string")
        ) {
          /** @type {{ collection: string, item: string, template: string, line: number, when?: string, empty?: string }} */
          const rep = {
            collection,
            item,
            template: tplLit.value,
            line: i,
          };
          if (whenRaw) rep.when = whenRaw;
          if (typeof elseLit.value === "string") rep.empty = elseLit.value;
          htmlRepeats.push(rep);
        } else {
          const repeatRaw = lines[i - 1] ?? "";
          let reason = "cwl:invalid-html-repeat";
          if (whenRaw && !whenOk) reason = "cwl:invalid-html-repeat-if";
          else if (!collectionOk) reason = "cwl:invalid-html-repeat-nested";
          attachmentHoles.push(reason);
          attachmentHoleLines.push(i);
          attachmentHoleCharacters.push(keywordStartCharacter0(repeatRaw));
          attachmentHoleEndCharacters.push(keywordEndCharacter0(repeatRaw, "repeat"));
        }
        continue;
      }
      // Early-exit guards (RFC-0021): cond + stmt-list body (nested if/foreach / else ok).
      const ifGuard = IF_GUARD_RE.exec(inner);
      if (ifGuard) {
        const nested = parseControlStmts(lines, i, handlerBindings());
        i = nested.nextI;
        const tail = parseElseTail(lines, i, handlerBindings(), nested.trailingElse ?? null);
        i = tail.nextI;
        earlyGuards.push({
          condExpr: ifGuard[1].trim(),
          status: nested.status,
          body: nested.body,
          stmts: nested.stmts,
          elseIfs: tail.elseIfs,
          elseStmts: tail.elseStmts,
          elseStatus: tail.elseStatus,
          elseBody: tail.elseBody,
        });
        continue;
      }
      // Stmt-level foreach binding (RFC-0021): collection + stmt-list body.
      const foreachBind = FOREACH_RE.exec(inner);
      if (foreachBind) {
        const nested = parseControlStmts(lines, i, handlerBindings());
        i = nested.nextI;
        foreachBindings.push({
          collection: foreachBind[1],
          key: foreachBind[2] ?? null,
          item: foreachBind[3],
          body: nested.body,
          stmts: nested.stmts,
        });
        continue;
      }
      const ret = RETURN_RE.exec(inner);
      if (ret) {
        const parsed = parseCwlReturnValue(ret[1], {
          path: handlerPathParams,
          query: handlerQueryParams,
          header: handlerHeaders,
          cookie: handlerCookies,
          body: bodyBindingsForReturn(),
          pathDefaults: handlerPathDefaults,
          queryDefaults: handlerQueryDefaults,
        });
        if (parsed.ok) {
          body = parsed.body;
        } else {
          body = { kind: "hole", reason: `cwl:${parsed.error}`, line: i };
        }
        sawReturn = true;
        continue;
      }
      const hol = HOLE_RE.exec(inner);
      if (hol) {
        const reason = hol[1];
        const holeRaw = lines[i - 1] ?? "";
        const holeCharacter = keywordStartCharacter0(holeRaw);
        const holeEndCharacter = keywordEndCharacter0(holeRaw, "hole");
        attachmentHoles.push(reason);
        attachmentHoleLines.push(i);
        attachmentHoleCharacters.push(holeCharacter);
        attachmentHoleEndCharacters.push(holeEndCharacter);
        // Keep hole as body only until an explicit return/html/ui replaces it (RFC-0024 attachments).
        if (!sawReturn) {
          body = { kind: "hole", reason, line: i, character: holeCharacter, endCharacter: holeEndCharacter };
        }
        continue;
      }
      {
        const unkRaw = lines[i - 1] ?? "";
        const unkTok = unkRaw.trim().match(/^\S+/)?.[0] ?? "?";
        body = {
          kind: "hole",
          reason: "cwl:unknown-statement",
          line: i,
          character: keywordStartCharacter0(unkRaw),
          endCharacter: keywordEndCharacter0(unkRaw, unkTok),
        };
      }
    }
    const pathParams = extractPathParamsFromCwlPath(path);
    for (const p of handlerPathParams) {
      if (!pathParams.includes(p)) {
        body = {
          kind: "hole",
          reason: `cwl:param-not-in-path:${p}`,
          line: lineNo,
          character: routeCharacter,
          endCharacter: routeEndCharacter,
        };
      }
    }
    routes.push({
      method,
      path,
      pathParams,
      name,
      line: lineNo,
      character: routeCharacter,
      endCharacter: routeEndCharacter,
      surfaceKind,
      effects,
      handlerPathParams,
      handlerPathDefaults,
      handlerQueryParams,
      handlerQueryDefaults,
      handlerHeaders,
      handlerCookies,
      handlerCookiePurposes,
      handlerBodyParams,
      handlerMultipartFields,
      handlerMultipartFiles,
      responseStatus: redirect?.status ?? responseStatus,
      redirect,
      responseContentType,
      streamKind,
      responseHeaders,
      loadBody,
      earlyGuards,
      foreachBindings,
      attachmentHoles,
      attachmentHoleLines,
      attachmentHoleCharacters,
      attachmentHoleEndCharacters,
      layoutName,
      ...(navId ? { navId } : {}),
      ...(typeof headHtml === "string" ? { headHtml } : {}),
      ...(typeof title === "string" ? { title } : {}),
      ...(typeof description === "string" ? { description } : {}),
      ...(typeof canonical === "string" ? { canonical } : {}),
      ...(typeof replaces === "string" ? { replaces } : {}),
      ...(peel ? { peel } : {}),
      ...(capabilities.length ? { capabilities } : {}),
      ...(worksWithoutClient ? { worksWithoutClient: true } : {}),
      ...(typeof routeDnaCertificate === "string" ? { dnaCertificate: routeDnaCertificate } : {}),
      ...(typeof routeDnaFingerprint === "string" ? { dnaFingerprint: routeDnaFingerprint } : {}),
      ...(routeMatchLive ? { matchLive: true } : {}),
      ...(metaCardHasFacts(metaCard) ? { metaCard } : {}),
      ...(pageStyles.length ? { pageStyles } : {}),
      ...(icons.length ? { icons } : {}),
      ...(preconnects.length ? { preconnects } : {}),
      ...(alternates.length ? { alternates } : {}),
      ...(jsonlds.length ? { jsonlds } : {}),
      pageIslands,
      htmlRepeats,
      dbOps,
      body,
    });
  }
  const parsedModule = {
    moduleName,
    moduleLine,
    moduleCharacter,
    moduleEndCharacter,
    file,
    routes,
    tables,
    engine,
    engineHoles,
    ...(dnaHoles.length ? { dnaHoles } : {}),
    ...(typeof dnaCertificate === "string" ? { dnaCertificate } : {}),
    ...(typeof dnaFingerprint === "string" ? { dnaFingerprint } : {}),
    ...(typeof dnaBank === "string" ? { dnaBank } : {}),
    ...(matchLive ? { matchLive: true } : {}),
    layouts,
    moduleUses,
    moduleAuthUses,
    imports,
    importLines,
    components,
  };
  finalizeCwlDbModule(parsedModule);
  return parsedModule;
}
