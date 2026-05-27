/**
 * Chrysalis Web Language (CWL) parser — direct surface syntax for WebIR routes.
 * @see docs/CWL.md
 */
import { extractPathParamsFromCwlPath } from "./hub-cwl-path-params.mjs";

const ROUTE_RE = /^@route\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+"([^"]+)"/i;
const MODULE_RE = /^module\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*;/;
const HANDLER_RE = /^handler\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\{/;
const EFFECTS_RE = /^effects:\s*(.+);/;
const RETURN_RE = /^return\s+(.+);/;
const HOLE_RE = /^hole\s+([a-zA-Z0-9_:.-]+)(?:\s+"([^"]*)")?\s*;/;
const USE_PRESET_RE = /^use\s+(json|urlencoded)\s*;$/i;
const PARAM_RE = /^param\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*;$/;
const QUERY_RE = /^query\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*;$/;

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
  return { ok: false, error: "unsupported-literal" };
}

/**
 * @param {string} expr
 * @param {{ path?: string[], query?: string[] }} bindings
 */
export function parseCwlReturnValue(expr, bindings = {}) {
  const pathBindings = bindings.path ?? (Array.isArray(bindings) ? bindings : []);
  const queryBindings = bindings.query ?? [];
  const t = expr.trim();
  if (t.startsWith("{") && t.endsWith("}")) {
    const entries = parseCwlObjectEntries(t, { path: pathBindings, query: queryBindings });
    if (!entries.ok) return { ok: false, error: entries.error };
    return { ok: true, body: { kind: "object", entries: entries.entries } };
  }
  const lit = parseCwlLiteral(t);
  if (lit.ok) return { ok: true, body: { kind: "literal", value: lit.value } };
  return { ok: false, error: "unsupported-return" };
}

/**
 * @param {string} objectExpr
 * @param {{ path: string[], query: string[] }} bindings
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
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(rawVal)) {
      if (bindings.path.includes(rawVal)) {
        entries.push({ key, value: { kind: "pathParam", name: rawVal } });
        continue;
      }
      if (bindings.query.includes(rawVal)) {
        entries.push({ key, value: { kind: "queryParam", name: rawVal } });
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
  /** @type {Array<{ method: string, path: string, pathParams: string[], name: string, line: number, effects: string[], handlerPathParams: string[], handlerQueryParams: string[], body: { kind: string, value?: unknown, entries?: Array<{ key: string, value: { kind: string, value?: unknown, name?: string } }>, reason?: string } }>} */
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
    const rm = ROUTE_RE.exec(line);
    if (!rm) continue;
    const method = rm[1].toUpperCase();
    const path = rm[2];
    if (i >= lines.length) break;
    const hline = lines[i].trim();
    const hm = HANDLER_RE.exec(hline);
    if (!hm) continue;
    const name = hm[1];
    i += 1;
    const effects = [];
    const handlerPathParams = [];
    const handlerQueryParams = [];
    let body = { kind: "hole", reason: "cwl:empty-handler" };
    while (i < lines.length) {
      const inner = lines[i].trim();
      i += 1;
      if (inner === "}") break;
      if (!inner || inner.startsWith("#") || inner.startsWith("//")) continue;
      const pm = PARAM_RE.exec(inner);
      if (pm) {
        if (!handlerPathParams.includes(pm[1])) handlerPathParams.push(pm[1]);
        continue;
      }
      const qm = QUERY_RE.exec(inner);
      if (qm) {
        if (!handlerQueryParams.includes(qm[1])) handlerQueryParams.push(qm[1]);
        continue;
      }
      const em = EFFECTS_RE.exec(inner);
      if (em) {
        effects.push(...parseEffects(em[1]));
        continue;
      }
      const ret = RETURN_RE.exec(inner);
      if (ret) {
        const parsed = parseCwlReturnValue(ret[1], {
          path: handlerPathParams,
          query: handlerQueryParams,
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
      effects,
      handlerPathParams,
      handlerQueryParams,
      body,
    });
  }
  return { moduleName, file, routes, moduleUses };
}
