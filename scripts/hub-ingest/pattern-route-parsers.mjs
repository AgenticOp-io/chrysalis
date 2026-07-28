/**
 * Per-language HTTP route pattern parsers (hub open matrix; bodies via hub-lift-webir-route).
 */
import { detectHttpRoutesInSource } from "./lift-routes-heuristic.mjs";
import { parseJavaRoutes } from "../../packages/hub-native-bridge/dist/java.js";
import { parseRubyRoutes } from "../../packages/hub-native-bridge/dist/ruby.js";
import { parseCsharpRoutes } from "../../packages/hub-native-bridge/dist/csharp.js";
import { parseCobolRoutes } from "./cobol-pattern-lift.mjs";

export { parseRubyRoutes, parseCsharpRoutes, parseCobolRoutes };

/**
 * @typedef {{ method: string, path: string, line: number, name?: string }} HubRoute
 */

/**
 * @param {string} source
 * @param {number} index
 */
export function lineAt(source, index) {
  return source.slice(0, index).split("\n").length;
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
  const key = `${method.toUpperCase()}:${path}`;
  if (seen.has(key)) return;
  seen.add(key);
  routes.push({
    method: method.toUpperCase(),
    path,
    line: lineAt(source, index),
    name: `r_${routes.length}`,
  });
}

/** Actix/Axum `.route` + Poem `.at` (G10029) — same `get|post|…(handler)` arg shape. */
const RUST_ROUTE_RE =
  /\.(?:route|at)\s*\(\s*"([^"]+)"\s*,\s*(?:web::)?(get|post|put|patch|delete|head|options)\s*\(/gi;
const RUST_MACRO_RE = /#\[(\w+)\s*\(\s*"([^"]+)"\s*\)\]/g;
const RUST_MACRO_FN_RE =
  /#\[(\w+)\s*\(\s*"([^"]+)"\s*\)\]\s*(?:pub\s+)?(?:async\s+)?fn\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/gi;
/**
 * Salvo secondary (G10037): `Router::with_path("…").get(handler)` / `.path("…").get(handler)`
 * with optional chained `.post|.put|…` on the same path. Nested `.push` path join = honest hole
 * (prefer flat full paths like `items/{id}`).
 */
const RUST_SALVO_PATH_METHODS_RE =
  /(?:Router::with_path|\.path)\s*\(\s*"([^"]+)"\s*\)((?:\s*\.\s*(?:get|post|put|patch|delete|head|options)\s*\(\s*[A-Za-z_][A-Za-z0-9_]*\s*\))+)/gi;
const RUST_SALVO_METHOD_CALL_RE =
  /\.\s*(get|post|put|patch|delete|head|options)\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/gi;
const SCALA_PLAY_RE = /\(\s*"(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)"\s*,\s*"([^"]+)"\s*\)/g;
const SCALA_SIRD_RE = /\b(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s*\(\s*p"([^"]+)"\s*\)/gi;
const SCALA_AKKA_ROUTE_RE =
  /\b(get|post|put|patch|delete|head|options)\s*\(\s*path\s*\(\s*"([^"]+)"\s*\)\s*\)/gi;
/** Http4s: `case GET -> Root / "items" / id =>` (optional `req @`, `Method.`). */
const SCALA_HTTP4S_CASE_RE =
  /\bcase\s+(?:(?:[A-Za-z_][A-Za-z0-9_]*)\s*@\s*)?(?:Method\.)?(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*->\s*Root((?:\s*\/\s*(?:"[^"]+"|(?:IntVar|LongVar|UUIDVar)\(\s*[A-Za-z_][A-Za-z0-9_]*\s*\)|[A-Za-z_][A-Za-z0-9_]*))+)\s*=>/gi;
const KTOR_ROUTE_RE = /\b(get|post|put|patch|delete|head|options)\s*\(\s*"([^"]+)"\s*\)/gi;
/** http4k secondary (G10024): `"path" bind Method.GET to` / `"path" bind GET to` / `bindMethod`. */
const HTTP4K_ROUTE_RE =
  /"([^"]+)"\s+bind(?:Method)?\s+(?:Method\.)?(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+to\b/gi;
const SWIFT_VAPOR_VERB_HEAD_RE = /\bapp\.(get|post|put|patch|delete|head)\s*\(/gi;
/** Hummingbird secondary dialect — single-string path: `router.get("/items/:id")`. */
const HUMMINGBIRD_ROUTE_RE =
  /\brouter\.(get|post|put|patch|delete|head)\s*\(\s*(['"])([^'"]+)\2/gi;
const HUMMINGBIRD_VERB_HEAD_RE = /\brouter\.(get|post|put|patch|delete|head)\s*\(/gi;

/**
 * @param {string} source
 * @param {number} openIdx — index of `(`
 * @returns {{ inner: string, end: number } | null}
 */
function extractBalancedParenInner(source, openIdx) {
  if (source[openIdx] !== "(") return null;
  let depth = 0;
  for (let i = openIdx; i < source.length; i++) {
    const ch = source[i];
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i += 1;
      while (i < source.length) {
        if (source[i] === "\\") {
          i += 2;
          continue;
        }
        if (source[i] === quote) break;
        i += 1;
      }
      continue;
    }
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) return { inner: source.slice(openIdx + 1, i), end: i };
    }
  }
  return null;
}

/**
 * Join Http4s `Root / "a" / id` chain to CWL-ish `/a/{id}`.
 * @param {string} chain
 */
export function http4sPathFromRootChain(chain) {
  const segs = [];
  const re =
    /\/\s*(?:"([^"]+)"|(?:IntVar|LongVar|UUIDVar)\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)|([A-Za-z_][A-Za-z0-9_]*))/g;
  let m;
  while ((m = re.exec(chain)) !== null) {
    if (m[1] !== undefined) segs.push(m[1]);
    else if (m[2] !== undefined) segs.push(`{${m[2]}}`);
    else segs.push(`{${m[3]}}`);
  }
  if (segs.length === 0) return "/";
  return `/${segs.join("/")}`;
}

/**
 * Join Vapor PathComponent string args: `"items", ":id"` → `/items/:id`.
 * @param {string} parenInner
 */
export function vaporPathFromComponentArgs(parenInner) {
  const segs = [];
  let i = 0;
  const inner = parenInner;
  while (i < inner.length) {
    while (i < inner.length && /[\s,]/.test(inner[i])) i += 1;
    if (i >= inner.length) break;
    if (inner[i] !== '"') break;
    i += 1;
    let s = "";
    while (i < inner.length && inner[i] !== '"') {
      if (inner[i] === "\\") {
        s += inner[i + 1] ?? "";
        i += 2;
        continue;
      }
      s += inner[i];
      i += 1;
    }
    if (inner[i] === '"') i += 1;
    segs.push(s);
  }
  if (segs.length === 0) return null;
  if (segs.length === 1) {
    const only = segs[0];
    if (only.startsWith("/")) return only;
    if (only.includes("/")) return only.startsWith("/") ? only : `/${only}`;
    return `/${only}`;
  }
  return `/${segs.map((s) => s.replace(/^\//, "")).join("/")}`;
}

export function parseKotlinRoutes(source, file) {
  const routes = parseJavaRoutes(source, file);
  const seen = new Set(routes.map((r) => `${r.method}:${r.path}`));
  let m;
  KTOR_ROUTE_RE.lastIndex = 0;
  while ((m = KTOR_ROUTE_RE.exec(source)) !== null) {
    pushRoute(routes, source, m[1], m[2], m.index, seen);
  }
  // http4k (G10024 / D6486) — after Ktor so Method.GET shapes do not collide with get("…").
  HTTP4K_ROUTE_RE.lastIndex = 0;
  while ((m = HTTP4K_ROUTE_RE.exec(source)) !== null) {
    pushRoute(routes, source, m[2], m[1], m.index, seen);
  }
  return routes;
}

/**
 * Join Axum `.nest("/prefix", …)` with an inner route path.
 * @param {string} prefix
 * @param {string} path
 */
export function joinAxumNestPath(prefix, path) {
  const p = String(prefix || "").replace(/\/$/, "");
  const rest = !path || path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  if (!p) return rest || "/";
  return `${p}${rest}` || "/";
}

/**
 * Normalize Salvo `with_path` / `.path` string to a leading-slash route path.
 * Salvo accepts `"health"` or `"/health"`; CWL peels prefer `/health`.
 * @param {string} raw
 */
export function normalizeSalvoRoutePath(raw) {
  const t = String(raw || "").trim();
  if (!t || t === "/") return "/";
  return t.startsWith("/") ? t : `/${t}`;
}

/**
 * Map nested router fn names → nest path prefix (`.nest("/api", api())`).
 * Shared by Axum + Poem (G10029). Inline `Router::new()` / `Route::new()` nest
 * targets are not lowered (honest hole / skip).
 * @param {string} source
 * @returns {Map<string, string>}
 */
export function collectAxumNestPrefixes(source) {
  /** @type {Map<string, string>} */
  const byFn = new Map();
  const nestRe =
    /\.nest\s*\(\s*"([^"]+)"\s*,\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(\s*\)\s*\)/gi;
  let m;
  while ((m = nestRe.exec(source)) !== null) {
    byFn.set(m[2], m[1]);
  }
  return byFn;
}

/**
 * Rocket `.mount("/prefix", routes![handler, …])` → handler fn → prefix.
 * @param {string} source
 * @returns {Map<string, string>}
 */
export function collectRocketMountPrefixes(source) {
  /** @type {Map<string, string>} */
  const byHandler = new Map();
  const mountRe = /\.mount\s*\(\s*"([^"]+)"\s*,\s*routes!\s*\[([\s\S]*?)\]\s*,?\s*\)/gi;
  let m;
  while ((m = mountRe.exec(source)) !== null) {
    const prefix = m[1];
    for (const raw of m[2].split(",")) {
      const name = raw.trim();
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) byHandler.set(name, prefix);
    }
  }
  return byHandler;
}

/**
 * Brace body range for `fn name(…) { … }` (first match).
 * @param {string} source
 * @param {string} fnName
 * @returns {{ start: number, end: number } | null}
 */
function rustFnBodyRange(source, fnName) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(fnName)) return null;
  const headRe = new RegExp(String.raw`(?:pub\s+)?(?:async\s+)?fn\s+${fnName}\s*\(`);
  const headM = headRe.exec(source);
  if (!headM || headM.index === undefined) return null;
  const parenOpen = headM.index + headM[0].length - 1;
  const params = extractBalancedParenInner(source, parenOpen);
  if (!params) return null;
  let i = params.end + 1;
  while (i < source.length && /\s/.test(source[i])) i += 1;
  if (source.startsWith("->", i)) {
    i += 2;
    let depth = 0;
    while (i < source.length) {
      const ch = source[i];
      if (ch === "(" || ch === "<") depth += 1;
      else if (ch === ")" || ch === ">") depth = Math.max(0, depth - 1);
      else if (ch === "{" && depth === 0) break;
      i += 1;
    }
  }
  while (i < source.length && /\s/.test(source[i])) i += 1;
  if (source[i] !== "{") return null;
  let depth = 0;
  const openIdx = i;
  for (let j = openIdx; j < source.length; j++) {
    const ch = source[j];
    if (ch === '"' || ch === "'") {
      const quote = ch;
      j += 1;
      while (j < source.length) {
        if (source[j] === "\\") {
          j += 2;
          continue;
        }
        if (source[j] === quote) break;
        j += 1;
      }
      continue;
    }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return { start: openIdx, end: j };
    }
  }
  return null;
}

export function parseRustRoutes(source) {
  const routes = [];
  const seen = new Set();
  const methodMap = {
    get: "GET",
    post: "POST",
    put: "PUT",
    delete: "DELETE",
    patch: "PATCH",
    head: "HEAD",
    options: "OPTIONS",
  };
  const nestByFn = collectAxumNestPrefixes(source);
  const mountByHandler = collectRocketMountPrefixes(source);
  /** @type {{ name: string, prefix: string, start: number, end: number }[]} */
  const nestRanges = [];
  for (const [name, prefix] of nestByFn) {
    const range = rustFnBodyRange(source, name);
    if (range) nestRanges.push({ name, prefix, ...range });
  }
  let m;
  RUST_ROUTE_RE.lastIndex = 0;
  while ((m = RUST_ROUTE_RE.exec(source)) !== null) {
    let path = m[1];
    for (const fr of nestRanges) {
      if (m.index >= fr.start && m.index <= fr.end) {
        path = joinAxumNestPath(fr.prefix, path);
        break;
      }
    }
    pushRoute(routes, source, m[2], path, m.index, seen);
  }
  RUST_MACRO_FN_RE.lastIndex = 0;
  while ((m = RUST_MACRO_FN_RE.exec(source)) !== null) {
    const verb = methodMap[m[1].toLowerCase()];
    if (!verb) continue;
    let path = m[2];
    const mountPrefix = mountByHandler.get(m[3]);
    if (mountPrefix) path = joinAxumNestPath(mountPrefix, path);
    pushRoute(routes, source, verb, path, m.index, seen);
  }
  // Salvo (G10037): Router::with_path("…").get(h) / .path("…").post(h) chains.
  RUST_SALVO_PATH_METHODS_RE.lastIndex = 0;
  while ((m = RUST_SALVO_PATH_METHODS_RE.exec(source)) !== null) {
    const path = normalizeSalvoRoutePath(m[1]);
    const chain = m[2] ?? "";
    const chainBase = m.index + m[0].indexOf(chain);
    RUST_SALVO_METHOD_CALL_RE.lastIndex = 0;
    let cm;
    while ((cm = RUST_SALVO_METHOD_CALL_RE.exec(chain)) !== null) {
      const verb = methodMap[cm[1].toLowerCase()];
      if (!verb) continue;
      pushRoute(routes, source, verb, path, chainBase + cm.index, seen);
    }
  }
  return routes;
}

export function parseScalaRoutes(source) {
  const routes = [];
  const seen = new Set();
  let m;
  while ((m = SCALA_PLAY_RE.exec(source)) !== null) {
    pushRoute(routes, source, m[1], m[2], m.index, seen);
  }
  SCALA_SIRD_RE.lastIndex = 0;
  while ((m = SCALA_SIRD_RE.exec(source)) !== null) {
    pushRoute(routes, source, m[1], m[2], m.index, seen);
  }
  SCALA_AKKA_ROUTE_RE.lastIndex = 0;
  while ((m = SCALA_AKKA_ROUTE_RE.exec(source)) !== null) {
    pushRoute(routes, source, m[1], m[2], m.index, seen);
  }
  SCALA_HTTP4S_CASE_RE.lastIndex = 0;
  while ((m = SCALA_HTTP4S_CASE_RE.exec(source)) !== null) {
    pushRoute(routes, source, m[1], http4sPathFromRootChain(m[2]), m.index, seen);
  }
  return routes;
}

export function parseElixirRoutes(source) {
  const routes = [];
  const seen = new Set();
  const re = /\b(get|post|put|patch|delete|head|options)\s+"([^"]+)"\s+do\b/gi;
  const methodMap = {
    get: "GET",
    post: "POST",
    put: "PUT",
    patch: "PATCH",
    delete: "DELETE",
    head: "HEAD",
    options: "OPTIONS",
  };
  let m;
  while ((m = re.exec(source)) !== null) {
    const method = methodMap[m[1].toLowerCase()];
    if (!method) continue;
    const path = m[2].replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, "{$1}");
    const key = `${method} ${path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const line = source.slice(0, m.index).split("\n").length;
    const pathParams = [...path.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g)].map((x) => x[1]);
    routes.push({ method, path, line, pathParams });
  }
  return routes;
}

export function parseDartRoutes(source) {
  const routes = [];
  const seen = new Set();
  const re =
    /\brouter\.(get|post|put|patch|delete|head|options)\s*\(\s*(['"])([^'"]+)\2\s*,/gi;
  const methodMap = {
    get: "GET",
    post: "POST",
    put: "PUT",
    patch: "PATCH",
    delete: "DELETE",
    head: "HEAD",
    options: "OPTIONS",
  };
  let m;
  while ((m = re.exec(source)) !== null) {
    const method = methodMap[m[1].toLowerCase()];
    if (!method) continue;
    const path = m[3].replace(/<([A-Za-z_][A-Za-z0-9_]*)>/g, "{$1}");
    const key = `${method} ${path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const line = source.slice(0, m.index).split("\n").length;
    const pathParams = [...path.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g)].map((x) => x[1]);
    routes.push({ method, path, line, pathParams });
  }
  return routes;
}

/**
 * Normalize Hummingbird `:id` / `{id}` path templates to CWL `{id}` form.
 * @param {string} path
 */
export function normalizeHummingbirdRoutePath(path) {
  return path.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, "{$1}");
}

export function parseSwiftRoutes(source) {
  const routes = [];
  const seen = new Set();
  let m;
  SWIFT_VAPOR_VERB_HEAD_RE.lastIndex = 0;
  while ((m = SWIFT_VAPOR_VERB_HEAD_RE.exec(source)) !== null) {
    const openIdx = m.index + m[0].length - 1;
    const bal = extractBalancedParenInner(source, openIdx);
    if (!bal) continue;
    const path = vaporPathFromComponentArgs(bal.inner);
    if (!path) continue;
    pushRoute(routes, source, m[1], path, m.index, seen);
  }
  HUMMINGBIRD_ROUTE_RE.lastIndex = 0;
  while ((m = HUMMINGBIRD_ROUTE_RE.exec(source)) !== null) {
    const raw = m[3];
    const path = normalizeHummingbirdRoutePath(raw.startsWith("/") ? raw : `/${raw}`);
    pushRoute(routes, source, m[1], path, m.index, seen);
  }
  HUMMINGBIRD_VERB_HEAD_RE.lastIndex = 0;
  while ((m = HUMMINGBIRD_VERB_HEAD_RE.exec(source)) !== null) {
    const openIdx = m.index + m[0].length - 1;
    const bal = extractBalancedParenInner(source, openIdx);
    if (!bal) continue;
    if (/^\s*['"]/.test(bal.inner)) continue;
    const path = vaporPathFromComponentArgs(bal.inner);
    if (!path) continue;
    pushRoute(routes, source, m[1], normalizeHummingbirdRoutePath(path), m.index, seen);
  }
  return routes;
}

export function extractVueScript(source) {
  const m = source.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
  return m?.[1] ?? "";
}

export function parseVueRoutes(source, file) {
  const script = extractVueScript(source);
  if (!script.trim()) return [];
  return detectHttpRoutesInSource(script, file).map((r) => ({
    method: r.method,
    path: r.path,
    line: r.line ?? 1,
    name: r.file,
  }));
}

/** @type {Record<string, (source: string, file: string) => HubRoute[]>} */
export const PATTERN_PARSERS = {
  ruby: (s) => parseRubyRoutes(s),
  csharp: (s) => parseCsharpRoutes(s),
  kotlin: (s) => parseKotlinRoutes(s),
  rust: (s) => parseRustRoutes(s),
  scala: (s) => parseScalaRoutes(s),
  swift: (s) => parseSwiftRoutes(s),
  elixir: (s) => parseElixirRoutes(s),
  dart: (s) => parseDartRoutes(s),
  vue: (s, f) => parseVueRoutes(s, f),
  cobol: (s, f) => parseCobolRoutes(s, f),
};

export const PATTERN_LIFT_LANGUAGE_IDS = Object.keys(PATTERN_PARSERS);
