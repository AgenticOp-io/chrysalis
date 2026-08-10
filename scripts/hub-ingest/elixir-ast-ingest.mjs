/**
 * Elixir hub ingest — Plug.Router macros for foundation gold (G9953) plus
 * Phoenix controller route-table (G10126 / D6540):
 *   get|post|… "/path", XxxController, :action + json/put_status / params["id"].
 * Does not invent Phoenix LiveView / pipelines / resources (D6447).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
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

/** Phoenix.Router: get "/path", Mod.Controller, :action (not Plug do…end). */
const PHOENIX_ROUTE_RE =
  /\b(get|post|put|patch|delete|head|options)\s+"([^"]+)"\s*,\s*([A-Za-z_][A-Za-z0-9_.]*)\s*,\s*:([A-Za-z_][A-Za-z0-9_]*)/gi;

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
 * @param {string} source
 */
export function isPhoenixRouterSource(source) {
  PHOENIX_ROUTE_RE.lastIndex = 0;
  return PHOENIX_ROUTE_RE.test(source);
}

/**
 * @param {string} source
 */
export function isPhoenixControllerSource(source) {
  return (
    /\bdefmodule\s+[A-Za-z0-9_.]+Controller\b/.test(source) &&
    /\bdef\s+[A-Za-z_][A-Za-z0-9_]*\s*\(\s*conn\b/.test(source) &&
    !isPhoenixRouterSource(source)
  );
}

/**
 * @param {string} source
 * @returns {Array<{ method: string, path: string, line: number, controller: string, action: string, pathParams?: string[] }>}
 */
export function parsePhoenixRouteTable(source) {
  /** @type {Array<{ method: string, path: string, line: number, controller: string, action: string, pathParams?: string[] }>} */
  const routes = [];
  const seen = new Set();
  PHOENIX_ROUTE_RE.lastIndex = 0;
  let m;
  while ((m = PHOENIX_ROUTE_RE.exec(source)) !== null) {
    const verb = METHOD_MAP[m[1].toLowerCase()];
    if (!verb) continue;
    const path = normalizeElixirRoutePath(m[2]);
    const key = `${verb} ${path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const line = source.slice(0, m.index).split("\n").length;
    const pathParams = [...path.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g)].map((x) => x[1]);
    routes.push({
      method: verb,
      path,
      line,
      controller: m[3],
      action: m[4],
      pathParams,
    });
  }
  return routes;
}

/**
 * Walk project for `defmodule Mod.Controller do` sources.
 * @param {string} projectDir
 * @returns {Map<string, { abs: string, source: string }>}
 */
function indexPhoenixControllers(projectDir) {
  /** @type {Map<string, { abs: string, source: string }>} */
  const map = new Map();
  /** @type {string[]} */
  const stack = [projectDir];
  while (stack.length > 0) {
    const dir = stack.pop();
    if (!dir) break;
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of entries) {
      if (name === "node_modules" || name === ".chrysalis" || name === "deps" || name === "_build") {
        continue;
      }
      const abs = join(dir, name);
      let st;
      try {
        st = statSync(abs);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        stack.push(abs);
        continue;
      }
      if (!/\.exs?$/i.test(name)) continue;
      let source = "";
      try {
        source = readFileSync(abs, "utf8");
      } catch {
        continue;
      }
      const mod = source.match(/\bdefmodule\s+([A-Za-z_][A-Za-z0-9_.]*Controller)\b/);
      if (mod) map.set(mod[1], { abs, source });
    }
  }
  return map;
}

/**
 * Extract `def action(conn, …) do … end` body from a Phoenix controller.
 * @param {string} source
 * @param {string} action
 * @returns {{ bodySlice: string, line: number } | null}
 */
function extractPhoenixActionBody(source, action) {
  const re = new RegExp(
    `\\bdef\\s+${action.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\s*\\(`,
  );
  const m = re.exec(source);
  if (!m) return null;
  const afterParen = source.indexOf(")", m.index + m[0].length - 1);
  if (afterParen < 0) return null;
  let i = afterParen + 1;
  while (i < source.length && /\s/.test(source[i])) i += 1;
  if (!source.startsWith("do", i)) return null;
  const extracted = extractElixirDoEndInner(source, i);
  if (!extracted) return null;
  const line = source.slice(0, m.index).split("\n").length;
  return { bodySlice: extracted.inner, line };
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
  // Phoenix controller params bag: params["id"] / params["q"] || ""
  for (const im of bodySlice.matchAll(
    /\bparams\[["']([^"']+)["']\](?:\s*\|\|\s*("([^"]*)"|'([^']*)'|true|false|-?\d+))?/g,
  )) {
    const field = im[1];
    if (byVar[field] && byVar[field].default === undefined && im[2] !== undefined) {
      const def = parseLiteralToken(im[2]);
      if (def !== null) byVar[field].default = def;
      continue;
    }
    if (byVar[field]) continue;
    const source = pathRefs[field] ? "path" : "query";
    const ref = { source, name: field };
    if (im[2] !== undefined) {
      const def = parseLiteralToken(im[2]);
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
    } else if (/^(?:conn\.(params|query_params|body_params|path_params)|params)\[/.test(rawVal)) {
      const q = rawVal.match(/\[["']([^"']+)["']\](?:\s*\|\|\s*("([^"]*)"|'([^']*)'))?/);
      if (!q) return null;
      const name = q[1];
      /** @type {"path"|"query"|"body"} */
      let source = "query";
      if (rawVal.includes("body_params")) source = "body";
      else if (rawVal.includes("query_params")) source = "query";
      else if (refs[name]?.source) source = /** @type {"path"|"query"|"body"} */ (refs[name].source);
      else if (rawVal.includes("path_params")) source = "path";
      const ref = refs[name] ?? { source, name };
      const value = { t: "ref", source: refs[name]?.source ?? source, name };
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
 * Phoenix.Controller `json/2` + `put_status/2` (pipe or nested). Falls back to Plug send_resp.
 * @param {string} bodySlice
 * @param {Record<string, { source: string, name: string, default?: unknown }>} refs
 */
function parsePhoenixControllerReturn(bodySlice, refs) {
  let status = 200;
  const statusPipe = bodySlice.match(/put_status\s*\(\s*(\d+)\s*\)/);
  const statusNested = bodySlice.match(/put_status\s*\(\s*conn\s*,\s*(\d+)\s*\)/);
  if (statusPipe) status = Number.parseInt(statusPipe[1], 10);
  else if (statusNested) status = Number.parseInt(statusNested[1], 10);

  const mapJson = [
    ...bodySlice.matchAll(/json\s*\(\s*(?:conn\s*,\s*)?%\{([\s\S]*?)\}\s*\)/g),
  ].pop();
  const litJson = [
    ...bodySlice.matchAll(
      /json\s*\(\s*(?:conn\s*,\s*)?(true|false|-?\d+|"[^"]*"|'[^']*')\s*\)/g,
    ),
  ].pop();
  const paramsJson = [
    ...bodySlice.matchAll(/json\s*\(\s*(?:conn\s*,\s*)?params\[["']([^"']+)["']\]\s*\)/g),
  ].pop();
  const refJson = [...bodySlice.matchAll(/json\s*\(\s*(?:conn\s*,\s*)?(\w+)\s*\)/g)].pop();

  /** @type {object | null} */
  let returnTree = null;
  /** @type {string | null} */
  let kind = null;

  if (mapJson) {
    returnTree = parseElixirMapEntries(mapJson[1], refs);
    kind = returnTree ? "json" : null;
  } else if (litJson) {
    const v = parseLiteralToken(litJson[1]);
    if (v !== null) {
      returnTree = { t: "lit", v };
      kind = "scalar-lit";
    }
  } else if (paramsJson) {
    const name = paramsJson[1];
    const ref = refs[name] ?? { source: refs[name]?.source === "path" ? "path" : "query", name };
    returnTree = { t: "ref", ...ref };
    kind = "scalar-ref";
  } else if (refJson && refs[refJson[1]]) {
    returnTree = { t: "ref", ...refs[refJson[1]] };
    kind = "scalar-ref";
  }

  if (kind) return { status, returnTree, kind };
  return parseElixirBodyReturn(bodySlice, refs);
}

/**
 * @param {object} opts
 */
function liftPhoenixRoutesToWebir(opts) {
  const { webir, builder, wr, source, file, language, projectDir } = opts;
  const data = webir.dataDialect.builders(builder);
  const effect = webir.effectDialect.builders(builder);
  const ctx = { data, effect, webir };
  const detailed = parsePhoenixRouteTable(source);
  if (detailed.length === 0) {
    return { routeCount: 0, astRouteCount: 0, usedAst: true, suppressFileLift: true };
  }

  const controllers = projectDir ? indexPhoenixControllers(projectDir) : new Map();

  for (const r of detailed) {
    const hit = controllers.get(r.controller);
    const ctrlSource = hit?.source ?? "";
    let ctrlFile = file;
    if (hit?.abs && projectDir) {
      ctrlFile = hit.abs.startsWith(projectDir)
        ? hit.abs.slice(projectDir.length).replace(/^[/\\]/, "").replace(/\\/g, "/")
        : hit.abs.replace(/\\/g, "/");
    }

    const extracted = ctrlSource ? extractPhoenixActionBody(ctrlSource, r.action) : null;
    const loc = { file: ctrlFile, line: extracted?.line ?? r.line };
    let bodyId;
    if (!extracted) {
      bodyId = hubHandlerBodyHole(ctx, "hub-elixir:phoenix-controller", {
        file: ctrlFile,
        line: r.line,
      });
    } else {
      const { bodySlice, line } = extracted;
      const bodyLoc = { file: ctrlFile, line };
      const pathRefs = pathParamRefsFromPath(r.path);
      const refs = parseElixirParamBindings(bodySlice, pathRefs);
      const { status, returnTree, kind } = parsePhoenixControllerReturn(bodySlice, refs);

      if (kind === "scalar-lit" && returnTree?.t === "lit" && status === 200) {
        bodyId = lowerHubLiteral(ctx, returnTree.v, bodyLoc);
      } else if (returnTree || (typeof status === "number" && status !== 200)) {
        bodyId =
          lowerElixirHandlerBodyFull(ctx, { returnTree, status }, bodyLoc) ??
          hubHandlerBodyHole(ctx, "hub-elixir:phoenix-controller", bodyLoc);
      } else {
        bodyId = hubHandlerBodyHole(ctx, "hub-elixir:phoenix-controller", bodyLoc);
      }
    }
    emitHubRoute({
      webir,
      builder,
      wr,
      language,
      file,
      route: { method: r.method, path: r.path, line: r.line, pathParams: r.pathParams },
      bodyId,
    });
  }

  return {
    routeCount: detailed.length,
    astRouteCount: detailed.length,
    usedAst: true,
  };
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

  // Controller bodies are resolved from the Phoenix router — suppress silver file-lift.
  if (isPhoenixControllerSource(source) && !isPhoenixRouterSource(source)) {
    return { routeCount: 0, astRouteCount: 0, usedAst: true, suppressFileLift: true };
  }

  if (isPhoenixRouterSource(source)) {
    return liftPhoenixRoutesToWebir(opts);
  }

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
