/**
 * Chrysalis Web Language (CWL) parser — direct surface syntax for WebIR routes.
 * @see docs/CWL.md
 */
import { extractPathParamsFromCwlPath } from "./hub-cwl-path-params.mjs";
import { parseCwlUiReturnBlock } from "./cwl-ui-tree.mjs";

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
const RESPONSE_HEADER_RE = /^response-header\s+([A-Za-z][A-Za-z0-9_-]*)\s*(?:=\s*(.+?))?\s*;$/;
const IF_GUARD_RE = /^if\s+(.+?)\s*\{$/;
const ELSE_IF_RE = /^else\s+if\s+(.+?)\s*\{$/;
const ELSE_RE = /^else\s*\{$/;
const FOREACH_RE = /^foreach\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+as(?:\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=>)?\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\{$/;

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
 * Split comma-separated object fields respecting nested `{` `[` brackets.
 * @param {string} inner
 */
function splitTopLevelObjectPairs(inner) {
  /** @type {string[]} */
  const pairs = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (c === "{" || c === "[") depth += 1;
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
 */
function parseEffects(effectsRaw) {
  const t = effectsRaw.trim().toLowerCase();
  if (t === "none" || t === "") return [];
  return t.split(",").map((s) => s.trim()).filter(Boolean);
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
      const cm = COOKIE_RE.exec(inner);
      if (cm) {
        if (!handlerCookies.includes(cm[1])) handlerCookies.push(cm[1]);
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
        effects.push(...parseEffects(em[1]));
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
      handlerBodyParams,
      handlerMultipartFields,
      handlerMultipartFiles,
      responseStatus,
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
      body,
    });
  }
  return {
    moduleName,
    moduleLine,
    moduleCharacter,
    moduleEndCharacter,
    file,
    routes,
    moduleUses,
    moduleAuthUses,
    imports,
    importLines,
    components,
  };
}
