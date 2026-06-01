/**
 * Chrysalis Web Language (CWL) parser — direct surface syntax for WebIR routes.
 * @see docs/CWL.md
 */
import { extractPathParamsFromCwlPath } from "./hub-cwl-path-params.mjs";

const ROUTE_RE = /^@route\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+"([^"]+)"/i;
const PAGE_RE = /^@page\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+"([^"]+)"/i;
const PAGE_BLOCK_RE = /^page\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\{/;
const HTML_RETURN_RE = /^return\s+html\s+(.+);$/i;
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
const STATUS_RE = /^status\s+(\d{3})\s*;$/;
const CONTENT_TYPE_RE = /^content-type\s+(.+?)\s*;$/i;

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
 * @param {string} objectExpr
 * @param {{ path: string[], query: string[], header: string[], cookie: string[], body: string[] }} bindings
 */
function parseCwlObjectEntries(objectExpr, bindings) {
  const inner = objectExpr.slice(1, -1).trim();
  if (!inner) return { ok: true, entries: [] };
  /** @type {Array<{ key: string, value: { kind: string, value?: unknown, name?: string } }>} */
  const entries = [];
  const pairRe = /([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*([^,}]+)/g;
  let m;
  while ((m = pairRe.exec(inner)) !== null) {
    const key = m[1];
    const rawVal = m[2].trim();
    const lit = parseCwlLiteral(rawVal);
    if (lit.ok) {
      entries.push({ key, value: { kind: "literal", value: lit.value } });
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
 * @param {string} source
 * @param {string} file
 */
export function parseCwlModule(source, file) {
  const lines = source.split(/\r?\n/);
  let moduleName = "main";
  /** @type {Array<"express.json"|"express.urlencoded">} */
  const moduleUses = [];
  /** @type {Array<"chrysalis.auth.session"|"chrysalis.auth.bearer">} */
  const moduleAuthUses = [];
  /** @type {string[]} */
  const imports = [];
  /** @type {Array<{ method: string, path: string, pathParams: string[], name: string, line: number, effects: string[], handlerPathParams: string[], handlerQueryParams: string[], handlerHeaders: string[], handlerCookies: string[], handlerBodyParams: string[], responseStatus: number | null, body: object }>} */
  const routes = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    const lineNo = i + 1;
    i += 1;
    if (!line || line.startsWith("#") || line.startsWith("//")) continue;
    const mod = MODULE_RE.exec(line);
    if (mod) {
      moduleName = mod[1];
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
    let responseStatus = null;
    let responseContentType = null;
    /** @type {object | null} */
    let loadBody = null;
    let body = { kind: "hole", reason: "cwl:empty-handler" };
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
      const em = EFFECTS_RE.exec(inner);
      if (em) {
        effects.push(...parseEffects(em[1]));
        continue;
      }
      const htmlRet = HTML_RETURN_RE.exec(inner);
      if (htmlRet) {
        const lit = parseCwlLiteral(htmlRet[1].trim());
        if (lit.ok && typeof lit.value === "string") {
          body = { kind: "html", value: lit.value };
          if (!responseContentType) responseContentType = "text/html; charset=utf-8";
        } else {
          body = { kind: "hole", reason: "cwl:invalid-html-return" };
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
          body: handlerBodyParams,
          pathDefaults: handlerPathDefaults,
          queryDefaults: handlerQueryDefaults,
        });
        if (parsed.ok) loadBody = parsed.body;
        else loadBody = { kind: "hole", reason: `cwl:${parsed.error}` };
        continue;
      }
      const ret = RETURN_RE.exec(inner);
      if (ret) {
        const parsed = parseCwlReturnValue(ret[1], {
          path: handlerPathParams,
          query: handlerQueryParams,
          header: handlerHeaders,
          cookie: handlerCookies,
          body: handlerBodyParams,
          pathDefaults: handlerPathDefaults,
          queryDefaults: handlerQueryDefaults,
        });
        if (parsed.ok) {
          body = parsed.body;
        } else {
          body = { kind: "hole", reason: `cwl:${parsed.error}` };
        }
        continue;
      }
      const hol = HOLE_RE.exec(inner);
      if (hol) {
        body = { kind: "hole", reason: hol[1] };
        continue;
      }
      body = { kind: "hole", reason: "cwl:unknown-statement" };
    }
    const pathParams = extractPathParamsFromCwlPath(path);
    for (const p of handlerPathParams) {
      if (!pathParams.includes(p)) {
        body = { kind: "hole", reason: `cwl:param-not-in-path:${p}` };
      }
    }
    routes.push({
      method,
      path,
      pathParams,
      name,
      line: lineNo,
      surfaceKind,
      effects,
      handlerPathParams,
      handlerQueryParams,
      handlerHeaders,
      handlerCookies,
      handlerBodyParams,
      responseStatus,
      responseContentType,
      loadBody,
      body,
    });
  }
  return { moduleName, file, routes, moduleUses, moduleAuthUses, imports };
}
