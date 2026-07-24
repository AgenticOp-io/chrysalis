/**
 * Elixir hub ingest — Plug.Router macros for foundation gold (G9953).
 * Peels `get|post|… "/path" do … end` + `send_resp` + `Jason.encode!`.
 * Does not invent Phoenix LiveView / controller runtime (D6447).
 */
import {
  emitHubRoute,
  hubHandlerBodyHole,
  hubOrigin,
  HUB_T,
  lowerHubLiteral,
} from "./hub-lift-webir-route.mjs";
import { lowerHubReturnTree } from "./hub-native-return-tree.mjs";

const ELIXIR_ROUTE_RE =
  /\b(get|post|put|patch|delete|head|options)\s+"([^"]+)"\s+do\b/gi;

const METHOD_MAP = {
  get: "GET",
  post: "POST",
  put: "PUT",
  patch: "PATCH",
  delete: "DELETE",
  head: "HEAD",
  options: "OPTIONS",
};

/**
 * @param {string} language
 * @param {string} ext
 */
export function canElixirAstIngest(language, ext) {
  const e = ext.toLowerCase();
  return language === "elixir" && (e === ".ex" || e === ".exs");
}

/**
 * Normalize Plug `:id` path templates to CWL `{id}` form.
 * @param {string} path
 */
export function normalizeElixirRoutePath(path) {
  return path.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, "{$1}");
}

/**
 * @param {string} path
 */
function pathParamRefsFromPath(path) {
  /** @type {Record<string, { source: string, name: string }>} */
  const refs = {};
  for (const m of path.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g)) {
    refs[m[1]] = { source: "path", name: m[1] };
  }
  return refs;
}

/**
 * Skip Elixir string / charlist / sigil literals (best-effort for gold peels).
 * @param {string} source
 * @param {number} i
 */
function skipElixirLiteral(source, i) {
  const ch = source[i];
  if (ch === '"' || ch === "'") {
    const quote = ch;
    let j = i + 1;
    while (j < source.length) {
      if (source[j] === "\\") {
        j += 2;
        continue;
      }
      if (source[j] === quote) return j + 1;
      j += 1;
    }
    return source.length;
  }
  // ~s"…" / ~S"…" / ~w(…) — advance past common sigils used in gold
  if (ch === "~" && i + 2 < source.length) {
    let j = i + 1;
    while (j < source.length && /[A-Za-z]/.test(source[j])) j += 1;
    const delim = source[j];
    if (!delim) return i + 1;
    const close =
      delim === "("
        ? ")"
        : delim === "["
          ? "]"
          : delim === "{"
            ? "}"
            : delim === "<"
              ? ">"
              : delim;
    j += 1;
    while (j < source.length) {
      if (source[j] === "\\" && (delim === '"' || delim === "'")) {
        j += 2;
        continue;
      }
      if (source[j] === close) return j + 1;
      j += 1;
    }
    return source.length;
  }
  return null;
}

/**
 * Extract inner of `do … end` starting at the index of `d` in `do`.
 * Tracks nested do/end (fn/case/with) so outer route bodies stay bounded.
 * @param {string} source
 * @param {number} doIdx
 */
export function extractElixirDoEndInner(source, doIdx) {
  if (!source.startsWith("do", doIdx) || (doIdx > 0 && /\w/.test(source[doIdx - 1]))) {
    return null;
  }
  let i = doIdx + 2;
  while (i < source.length && /\s/.test(source[i])) i += 1;
  const start = i;
  let depth = 1;
  while (i < source.length) {
    const skipped = skipElixirLiteral(source, i);
    if (skipped !== null) {
      i = skipped;
      continue;
    }
    if (source.startsWith("do", i) && (i === 0 || !/\w/.test(source[i - 1])) && !/\w/.test(source[i + 2] ?? "")) {
      depth += 1;
      i += 2;
      continue;
    }
    if (source.startsWith("end", i) && (i === 0 || !/\w/.test(source[i - 1])) && !/\w/.test(source[i + 3] ?? "")) {
      depth -= 1;
      if (depth === 0) {
        return { inner: source.slice(start, i), end: i + 3 };
      }
      i += 3;
      continue;
    }
    i += 1;
  }
  return null;
}

/**
 * @param {string} raw
 */
function parseLiteralToken(raw) {
  const t = raw.trim();
  if (t === "true") return true;
  if (t === "false") return false;
  if (t === "nil" || t === "null") return null;
  if (/^-?\d+$/.test(t)) return Number.parseInt(t, 10);
  if (/^-?\d+\.\d+$/.test(t)) return Number.parseFloat(t);
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return null;
}

/**
 * @param {HubRoute[]} routes
 * @param {string} source
 * @param {string} method
 * @param {string} path
 * @param {number} index
 * @param {Set<string>} seen
 */
function pushRoute(routes, source, method, path, index, seen) {
  const key = `${method} ${path}`;
  if (seen.has(key)) return;
  seen.add(key);
  const line = source.slice(0, index).split("\n").length;
  const norm = normalizeElixirRoutePath(path);
  const pathParams = [...norm.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g)].map((m) => m[1]);
  routes.push({ method, path: norm, line, pathParams });
}

/**
 * @typedef {{ method: string, path: string, line: number, pathParams?: string[] }} HubRoute
 */

/**
 * @param {string} source
 * @returns {HubRoute[]}
 */
export function parseElixirPlugRoutes(source) {
  const routes = [];
  const seen = new Set();
  ELIXIR_ROUTE_RE.lastIndex = 0;
  let m;
  while ((m = ELIXIR_ROUTE_RE.exec(source)) !== null) {
    const verb = METHOD_MAP[m[1].toLowerCase()];
    if (!verb) continue;
    pushRoute(routes, source, verb, m[2], m.index, seen);
  }
  return routes;
}

/**
 * Bindings: `id = conn.params["id"]` / query_params / body_params / path_params.
 * @param {string} bodySlice
 * @param {Record<string, { source: string, name: string, default?: unknown }>} pathRefs
 */
function parseElixirParamBindings(bodySlice, pathRefs) {
  /** @type {Record<string, { source: string, name: string, default?: unknown }>} */
  const byVar = { ...pathRefs };
  const bindRe =
    /(\w+)\s*=\s*conn\.(params|query_params|body_params|path_params)\[["']([^"']+)["']\](?:\s*\|\|\s*("([^"]*)"|'([^']*)'|true|false|-?\d+))?/g;
  let m;
  while ((m = bindRe.exec(bodySlice)) !== null) {
    const varName = m[1];
    const bag = m[2];
    const field = m[3];
    /** @type {"path"|"query"|"body"} */
    let source = "query";
    if (bag === "params" || bag === "path_params") {
      source = pathRefs[field] || pathRefs[varName] ? "path" : "query";
      if (pathRefs[field] || Object.values(pathRefs).some((r) => r.name === field)) source = "path";
    } else if (bag === "body_params") source = "body";
    else source = "query";
    /** @type {{ source: string, name: string, default?: unknown }} */
    const ref = { source, name: field };
    if (m[4] !== undefined) {
      const def = parseLiteralToken(m[4]);
      if (def !== null) ref.default = def;
    }
    byVar[varName] = ref;
    byVar[field] = ref;
  }
  // Inline conn.params["x"] without bind
  for (const im of bodySlice.matchAll(
    /conn\.(params|query_params|body_params|path_params)\[["']([^"']+)["']\](?:\s*\|\|\s*("([^"]*)"|'([^']*)'|true|false|-?\d+))?/g,
  )) {
    const bag = im[1];
    const field = im[2];
    if (byVar[field]) {
      if (im[3] !== undefined && byVar[field].default === undefined) {
        const def = parseLiteralToken(im[3]);
        if (def !== null) byVar[field].default = def;
      }
      continue;
    }
    let source = "query";
    if (bag === "params" || bag === "path_params") {
      source = pathRefs[field] ? "path" : "query";
    } else if (bag === "body_params") source = "body";
    const ref = { source, name: field };
    if (im[3] !== undefined) {
      const def = parseLiteralToken(im[3]);
      if (def !== null) ref.default = def;
    }
    byVar[field] = ref;
  }
  return byVar;
}

/**
 * Parse `%{key: val, ...}` map entries (atom keys).
 * @param {string} inner
 * @param {Record<string, { source: string, name: string, default?: unknown }>} refs
 */
function parseElixirMapEntries(inner, refs) {
  /** @type {Array<{ key: string, value: object }>} */
  const entries = [];
  for (const pair of inner.matchAll(/(\w+)\s*:\s*([^,\n}]+)/g)) {
    const key = pair[1];
    const rawVal = pair[2].trim();
    if (refs[rawVal]) {
      entries.push({ key, value: { t: "ref", ...refs[rawVal] } });
    } else if (/^conn\.(params|query_params|body_params|path_params)\[/.test(rawVal)) {
      const q = rawVal.match(/\[["']([^"']+)["']\](?:\s*\|\|\s*("([^"]*)"|'([^']*)'))?/);
      if (!q) return null;
      const name = q[1];
      const ref = refs[name] ?? {
        source: rawVal.includes("body_params")
          ? "body"
          : rawVal.includes("query_params")
            ? "query"
            : refs[name]?.source === "path" || /:id|:userId/.test(rawVal)
              ? "path"
              : "query",
        name,
      };
      const value = { t: "ref", ...ref };
      if (q[2] !== undefined) {
        const def = parseLiteralToken(q[2]);
        if (def !== null) value.default = def;
      }
      entries.push({ key, value });
    } else {
      const lit = parseLiteralToken(rawVal);
      if (lit === null) return null;
      entries.push({ key, value: { t: "lit", v: lit } });
    }
  }
  if (entries.length === 0) return null;
  return { t: "obj", entries };
}

/**
 * @param {string} bodySlice
 * @param {Record<string, { source: string, name: string, default?: unknown }>} refs
 */
function parseElixirBodyReturn(bodySlice, refs) {
  let status = 200;
  /** @type {object | null} */
  let returnTree = null;
  /** @type {string | null} */
  let kind = null;

  const mapSend = [
    ...bodySlice.matchAll(
      /send_resp\s*\(\s*conn\s*,\s*(\d+)\s*,\s*Jason\.encode!\(\s*%\{([\s\S]*?)\}\s*\)\s*\)/g,
    ),
  ].pop();
  const litSend = [
    ...bodySlice.matchAll(
      /send_resp\s*\(\s*conn\s*,\s*(\d+)\s*,\s*Jason\.encode!\(\s*(true|false|-?\d+|"[^"]*"|'[^']*')\s*\)\s*\)/g,
    ),
  ].pop();
  const refSend = [
    ...bodySlice.matchAll(
      /send_resp\s*\(\s*conn\s*,\s*(\d+)\s*,\s*Jason\.encode!\(\s*(\w+)\s*\)\s*\)/g,
    ),
  ].pop();
  const connSend = [
    ...bodySlice.matchAll(
      /send_resp\s*\(\s*conn\s*,\s*(\d+)\s*,\s*conn\.(params|query_params|body_params|path_params)\[["']([^"']+)["']\]\s*\)/g,
    ),
  ].pop();
  const varSend = [
    ...bodySlice.matchAll(/send_resp\s*\(\s*conn\s*,\s*(\d+)\s*,\s*(\w+)\s*\)/g),
  ].pop();

  if (mapSend) {
    status = Number.parseInt(mapSend[1], 10);
    returnTree = parseElixirMapEntries(mapSend[2], refs);
    kind = returnTree ? "json" : null;
  } else if (litSend) {
    status = Number.parseInt(litSend[1], 10);
    const v = parseLiteralToken(litSend[2]);
    if (v !== null) {
      returnTree = { t: "lit", v };
      kind = "scalar-lit";
    }
  } else if (refSend && refs[refSend[2]]) {
    status = Number.parseInt(refSend[1], 10);
    returnTree = { t: "ref", ...refs[refSend[2]] };
    kind = "scalar-ref";
  } else if (connSend) {
    status = Number.parseInt(connSend[1], 10);
    const bag = connSend[2];
    const name = connSend[3];
    const src =
      bag === "body_params"
        ? "body"
        : bag === "query_params"
          ? "query"
          : refs[name]
            ? refs[name].source
            : "path";
    returnTree = { t: "ref", source: src, name };
    kind = "scalar-ref";
  } else if (varSend && refs[varSend[2]]) {
    status = Number.parseInt(varSend[1], 10);
    returnTree = { t: "ref", ...refs[varSend[2]] };
    kind = "scalar-ref";
  }

  return { status, returnTree, kind };
}

/**
 * @param {object} ctx
 * @param {{ returnTree: object | null, status?: number }} parsed
 * @param {{ file: string, line?: number }} loc
 */
function lowerElixirHandlerBodyFull(ctx, parsed, loc) {
  const { data, effect, webir } = ctx;
  const origin = hubOrigin(loc.file, loc.line ?? 1);
  /** @type {import('@chrysalis/webir').NodeId[]} */
  const statements = [];
  const status = parsed.status;
  if (typeof status === "number" && Number.isFinite(status) && status !== 200) {
    statements.push(
      effect.httpError({
        status,
        message: null,
        origin,
        provenance: [webir.provenance("hub-ingest", "elixir-ast:send-resp-status")],
      }),
    );
  }
  if (parsed.returnTree) {
    const valId = lowerHubReturnTree(ctx, parsed.returnTree, loc);
    if (valId !== null) {
      statements.push(
        data.call({
          callee: "__return_json",
          args: [valId],
          type: HUB_T.unknown,
          origin,
          provenance: [webir.provenance("hub-ingest", "return-tree:json")],
        }),
      );
    }
  }
  if (statements.length === 0) return null;
  return data.block({
    statements,
    type: HUB_T.unknown,
    origin,
    provenance: [webir.provenance("hub-ingest", "elixir-handler-body")],
  });
}

/**
 * @param {object} opts
 */
export function liftElixirFileToWebir(opts) {
  const { webir, builder, wr, source, file, language } = opts;
  const data = webir.dataDialect.builders(builder);
  const effect = webir.effectDialect.builders(builder);
  const ctx = { data, effect, webir };
  const routes = parseElixirPlugRoutes(source);
  if (routes.length === 0) {
    return { routeCount: 0, astRouteCount: 0, usedAst: false };
  }

  ELIXIR_ROUTE_RE.lastIndex = 0;
  /** @type {Map<string, { bodySlice: string, line: number }>} */
  const bodiesByKey = new Map();
  let m;
  while ((m = ELIXIR_ROUTE_RE.exec(source)) !== null) {
    const verb = METHOD_MAP[m[1].toLowerCase()];
    if (!verb) continue;
    const path = normalizeElixirRoutePath(m[2]);
    const doIdx = m.index + m[0].length - 2; // points at 'd' of do
    const extracted = extractElixirDoEndInner(source, doIdx);
    if (!extracted) continue;
    const line = source.slice(0, m.index).split("\n").length;
    bodiesByKey.set(`${verb} ${path}`, { bodySlice: extracted.inner, line });
  }

  for (const r of routes) {
    const extracted = bodiesByKey.get(`${r.method} ${r.path}`);
    let bodyId;
    if (!extracted) {
      bodyId = hubHandlerBodyHole(ctx, "hub-elixir:handler-body", { file, line: r.line });
    } else {
      const { bodySlice, line } = extracted;
      const loc = { file, line };
      const pathRefs = pathParamRefsFromPath(r.path);
      const refs = parseElixirParamBindings(bodySlice, pathRefs);
      const { status, returnTree, kind } = parseElixirBodyReturn(bodySlice, refs);

      if (kind === "scalar-lit" && returnTree?.t === "lit" && status === 200) {
        bodyId = lowerHubLiteral(ctx, returnTree.v, loc);
      } else if (returnTree || (typeof status === "number" && status !== 200)) {
        bodyId =
          lowerElixirHandlerBodyFull(ctx, { returnTree, status }, loc) ??
          hubHandlerBodyHole(ctx, "hub-elixir:handler-body", loc);
      } else {
        bodyId = hubHandlerBodyHole(ctx, "hub-elixir:handler-body", loc);
      }
    }
    emitHubRoute({ webir, builder, wr, language, file, route: r, bodyId });
  }

  return { routeCount: routes.length, astRouteCount: routes.length, usedAst: true };
}
