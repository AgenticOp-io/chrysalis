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
const RUST_MACRO_RE = /#\[(\w+)\s*\(\s*"([^"]*)"\s*\)\]/g;
const RUST_MACRO_FN_RE =
  /#\[(\w+)\s*\(\s*"([^"]*)"\s*\)\]\s*(?:pub\s+)?(?:async\s+)?fn\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/gi;
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
/**
 * Finch secondary (G10051): verb head for `get("path")` / `get("items" :: path[String])`.
 * Akka `get(path("…"))` is rejected by isFinchMatcherInner (must start with string lit).
 */
const SCALA_FINCH_VERB_HEAD_RE = /\b(get|post|put|patch|delete|head|options)\s*\(/gi;
const KTOR_ROUTE_RE = /\b(get|post|put|patch|delete|head|options)\s*\(\s*"([^"]+)"\s*\)/gi;
/** http4k secondary (G10024): `"path" bind Method.GET to` / `"path" bind GET to` / `bindMethod`. */
const HTTP4K_ROUTE_RE =
  /"([^"]+)"\s+bind(?:Method)?\s+(?:Method\.)?(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+to\b/gi;
/** Vapor `app.get|post|…` or group-receiver `api.get|post|…` (G10069). */
const SWIFT_VAPOR_VERB_HEAD_RE =
  /\b([A-Za-z_][A-Za-z0-9_]*)\.(get|post|put|patch|delete|head)\s*\(/gi;
/** `app.grouped("prefix").get|post|…` chained form (literal PathComponents only). */
const SWIFT_VAPOR_GROUPED_CHAIN_RE =
  /\b([A-Za-z_][A-Za-z0-9_]*)\s*\.\s*grouped\s*\(/gi;
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
 * Finch matcher must be string-led (`"health"` / `"items" :: path[String]`).
 * Rejects Akka `path("…")` so ST stays untouched.
 * @param {string} inner
 */
export function isFinchMatcherInner(inner) {
  const t = String(inner ?? "").trim();
  if (!t) return false;
  if (/^path\s*\(/.test(t)) return false;
  return t.startsWith('"');
}

/**
 * Split Finch HList combinators on top-level `::`.
 * @param {string} inner
 * @returns {string[]}
 */
export function splitFinchCombinators(inner) {
  const parts = [];
  let depthParen = 0;
  let depthBracket = 0;
  let start = 0;
  const s = String(inner ?? "");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i += 1;
      while (i < s.length) {
        if (s[i] === "\\") {
          i += 2;
          continue;
        }
        if (s[i] === quote) break;
        i += 1;
      }
      continue;
    }
    if (ch === "(") depthParen += 1;
    else if (ch === ")") depthParen -= 1;
    else if (ch === "[") depthBracket += 1;
    else if (ch === "]") depthBracket -= 1;
    else if (
      ch === ":" &&
      s[i + 1] === ":" &&
      depthParen === 0 &&
      depthBracket === 0
    ) {
      parts.push(s.slice(start, i).trim());
      i += 1;
      start = i + 1;
    }
  }
  parts.push(s.slice(start).trim());
  return parts.filter(Boolean);
}

/**
 * Lambda binder names at the start of a Finch/Akka brace body (`id =>` / `(id: String) =>`).
 * @param {string} bodySlice
 * @returns {string[]}
 */
export function extractScalaEndpointLambdaNames(bodySlice) {
  const m = String(bodySlice ?? "")
    .trimStart()
    .match(/^(?:\(([^)=>]+)\)|([A-Za-z_][A-Za-z0-9_]*))(?:\s*:\s*[^=]+)?\s*=>/);
  if (!m) return [];
  const raw = (m[1] ?? m[2]).trim();
  return raw
    .split(",")
    .map((p) => p.trim().split(":")[0].trim())
    .filter(Boolean);
}

/**
 * Strip Finch/Akka `{ id => … }` binder prefix; leave Ok/complete body.
 * @param {string} bodySlice
 * @returns {{ body: string, params: string[] }}
 */
export function stripScalaEndpointLambda(bodySlice) {
  const src = String(bodySlice ?? "");
  const trimmed = src.trimStart();
  const m = trimmed.match(
    /^(?:\(([^)=>]+)\)|([A-Za-z_][A-Za-z0-9_]*))(?:\s*:\s*[^=]+)?\s*=>\s*/,
  );
  if (!m) return { body: src, params: [] };
  return {
    body: trimmed.slice(m[0].length),
    params: extractScalaEndpointLambdaNames(trimmed),
  };
}

/**
 * True when index sits on a `//` or `*` / `/*` comment line (Finch docstring false positives).
 * @param {string} source
 * @param {number} index
 */
function isScalaCommentishAt(source, index) {
  const lineStart = source.lastIndexOf("\n", Math.max(0, index - 1)) + 1;
  const prefix = source.slice(lineStart, index).trimStart();
  return prefix.startsWith("//") || prefix.startsWith("*") || prefix.startsWith("/*");
}

/**
 * Peel flat Finch matcher → CWL path + query binds (G10051).
 * Cheap shapes only: string lits, `path[T]`, `param[T]("q")` / `paramOption`.
 * @param {string} matcherInner
 * @param {string[]} [lambdaParamNames]
 * @returns {{ path: string, queryBinds: Array<{ varName: string, queryName: string }> } | null}
 */
export function parseFinchEndpointMatcher(matcherInner, lambdaParamNames = []) {
  if (!isFinchMatcherInner(matcherInner)) return null;
  const parts = splitFinchCombinators(matcherInner.trim());
  if (parts.length === 0) return null;
  /** @type {string[]} */
  const segs = [];
  /** @type {Array<{ varName: string, queryName: string }>} */
  const queryBinds = [];
  let valueIdx = 0;
  for (const part of parts) {
    const p = part.trim();
    const lit = /^"([^"]*)"$/.exec(p);
    if (lit) {
      const s = lit[1];
      if (s.includes("/")) {
        for (const piece of s.split("/").filter(Boolean)) segs.push(piece);
      } else if (s.length > 0) {
        segs.push(s);
      }
      continue;
    }
    if (/^path\s*(?:\[[^\]]*\])?\s*$/.test(p)) {
      const name = lambdaParamNames[valueIdx++] ?? `p${segs.length}`;
      segs.push(`{${name}}`);
      continue;
    }
    const qm = /^param(?:Option)?\s*(?:\[[^\]]*\])?\s*\(\s*"([^"]+)"\s*\)$/.exec(p);
    if (qm) {
      const varName = lambdaParamNames[valueIdx++] ?? qm[1];
      queryBinds.push({ varName, queryName: qm[1] });
      continue;
    }
    return null;
  }
  const path = segs.length === 0 ? "/" : `/${segs.join("/")}`;
  return { path, queryBinds };
}

/**
 * Resolve Finch endpoint at a source offset (line start or verb index).
 * @param {string} source
 * @param {number} fromIndex
 * @returns {{ method: string, path: string, queryBinds: Array<{ varName: string, queryName: string }>, index: number } | null}
 */
export function findFinchEndpointAt(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 800);
  SCALA_FINCH_VERB_HEAD_RE.lastIndex = 0;
  const m = SCALA_FINCH_VERB_HEAD_RE.exec(slice);
  if (!m || m.index === undefined) return null;
  const absIndex = fromIndex + m.index;
  if (isScalaCommentishAt(source, absIndex)) return null;
  const absOpen = absIndex + m[0].length - 1;
  const bal = extractBalancedParenInner(source, absOpen);
  if (!bal || !isFinchMatcherInner(bal.inner)) return null;
  const after = source.slice(bal.end + 1, bal.end + 1 + 240);
  /** @type {string[]} */
  let lambdaNames = [];
  if (braceRelSafe(after)) {
    const braceRel = after.indexOf("{");
    lambdaNames = extractScalaEndpointLambdaNames(source.slice(bal.end + 1 + braceRel + 1));
  }
  const parsed = parseFinchEndpointMatcher(bal.inner, lambdaNames);
  if (!parsed) return null;
  return {
    method: m[1],
    path: parsed.path,
    queryBinds: parsed.queryBinds,
    index: absIndex,
  };
}

/** @param {string} after */
function braceRelSafe(after) {
  return /^\s*\{/.test(after);
}

/**
 * Join Vapor PathComponent string args: `"items", ":id"` → `/items/:id`.
 * Returns null when any arg is non-literal (middleware / dynamic PathComponent).
 * @param {string} parenInner
 */
export function vaporPathFromComponentArgs(parenInner) {
  const segs = [];
  let i = 0;
  const inner = parenInner;
  while (i < inner.length) {
    while (i < inner.length && /[\s,]/.test(inner[i])) i += 1;
    if (i >= inner.length) break;
    if (inner[i] !== '"') return null;
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
    if (only === "") return "/";
    if (only.startsWith("/")) return only;
    if (only.includes("/")) return only.startsWith("/") ? only : `/${only}`;
    return `/${only}`;
  }
  return `/${segs.map((s) => s.replace(/^\//, "")).join("/")}`;
}

/**
 * Join Vapor `grouped("prefix")` with an inner route path (G10069 / D6531).
 * @param {string} prefix
 * @param {string} path
 */
export function joinVaporGroupPath(prefix, path) {
  return joinAxumNestPath(prefix, path);
}

/**
 * Collect `let name = receiver.grouped("a", "b")` bindings → name → joined prefix.
 * Literal PathComponent string args only; middleware-only / non-literal grouped = skip.
 * Nested `let items = api.grouped("items")` resolves once parent is known.
 * @param {string} source
 * @returns {Map<string, string>}
 */
export function collectVaporGroupPrefixes(source) {
  /** @type {{ name: string, receiver: string, pathSeg: string }[]} */
  const bindings = [];
  const bindRe =
    /\b(?:let|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([A-Za-z_][A-Za-z0-9_]*)\s*\.\s*grouped\s*\(/gi;
  let m;
  while ((m = bindRe.exec(source)) !== null) {
    const name = m[1];
    const receiver = m[2];
    const openIdx = m.index + m[0].length - 1;
    const bal = extractBalancedParenInner(source, openIdx);
    if (!bal) continue;
    const pathSeg = vaporPathFromComponentArgs(bal.inner);
    if (!pathSeg) continue;
    bindings.push({ name, receiver, pathSeg });
  }
  /** @type {Map<string, string>} */
  const byName = new Map();
  let changed = true;
  while (changed) {
    changed = false;
    for (const b of bindings) {
      if (byName.has(b.name)) continue;
      let parentPrefix = "";
      if (b.receiver === "app") {
        parentPrefix = "";
      } else if (byName.has(b.receiver)) {
        parentPrefix = byName.get(b.receiver) ?? "";
      } else {
        continue;
      }
      byName.set(b.name, joinVaporGroupPath(parentPrefix, b.pathSeg));
      changed = true;
    }
  }
  return byName;
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
 * End index of an Actix `web::scope("…")` method chain (`.service` / `.route` / …).
 * Stops at the first non-chained token (comma, `;`, `)`, etc.).
 * @param {string} source
 * @param {number} start — index immediately after `web::scope("…")`
 */
function actixScopeChainEnd(source, start) {
  let i = start;
  while (i < source.length) {
    while (i < source.length && /\s/.test(source[i])) i += 1;
    if (source[i] !== ".") break;
    const rest = source.slice(i);
    const callM = /^\.\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(/.exec(rest);
    if (!callM) break;
    const parenOpen = i + callM[0].length - 1;
    const bal = extractBalancedParenInner(source, parenOpen);
    if (!bal) break;
    i = bal.end + 1;
  }
  return i;
}

/**
 * Actix `web::scope("/prefix").service(handler)` / `.route("…", web::get().to(…))`
 * → handler fn → prefix + chain ranges for `.route` path join (G10068 / D6530).
 * Nested scopes / `.guard` / `web::resource` remain honest holes when not cheap.
 * @param {string} source
 * @returns {{ byHandler: Map<string, string>, ranges: Array<{ prefix: string, start: number, end: number }> }}
 */
export function collectActixScopePrefixes(source) {
  /** @type {Map<string, string>} */
  const byHandler = new Map();
  /** @type {{ prefix: string, start: number, end: number }[]} */
  const ranges = [];
  const scopeRe = /web::scope\s*\(\s*"([^"]+)"\s*\)/gi;
  let m;
  while ((m = scopeRe.exec(source)) !== null) {
    const prefix = m[1];
    const chainStart = m.index + m[0].length;
    const chainEnd = actixScopeChainEnd(source, chainStart);
    ranges.push({ prefix, start: m.index, end: chainEnd });
    const slice = source.slice(chainStart, chainEnd);
    const svcRe = /\.\s*service\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/g;
    let sm;
    while ((sm = svcRe.exec(slice)) !== null) {
      byHandler.set(sm[1], prefix);
    }
    // `.route("…", web::get().to(handler))` — map handler for any leftover macro join.
    const toRe = /\.\s*to\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/g;
    let tm;
    while ((tm = toRe.exec(slice)) !== null) {
      byHandler.set(tm[1], prefix);
    }
  }
  return { byHandler, ranges };
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
  const actixScope = collectActixScopePrefixes(source);
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
    for (const sr of actixScope.ranges) {
      if (m.index >= sr.start && m.index <= sr.end) {
        path = joinAxumNestPath(sr.prefix, path);
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
    const mountPrefix = mountByHandler.get(m[3]) ?? actixScope.byHandler.get(m[3]);
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
  // Finch secondary (G10051 / D6513) — after Akka/Http4s so path("…") ST stays first.
  SCALA_FINCH_VERB_HEAD_RE.lastIndex = 0;
  while ((m = SCALA_FINCH_VERB_HEAD_RE.exec(source)) !== null) {
    if (isScalaCommentishAt(source, m.index)) continue;
    const openIdx = m.index + m[0].length - 1;
    const bal = extractBalancedParenInner(source, openIdx);
    if (!bal || !isFinchMatcherInner(bal.inner)) continue;
    const after = source.slice(bal.end + 1, bal.end + 1 + 240);
    /** @type {string[]} */
    let lambdaNames = [];
    if (/^\s*\{/.test(after)) {
      const braceRel = after.indexOf("{");
      lambdaNames = extractScalaEndpointLambdaNames(source.slice(bal.end + 1 + braceRel + 1));
    }
    const parsed = parseFinchEndpointMatcher(bal.inner, lambdaNames);
    if (!parsed) continue;
    pushRoute(routes, source, m[1], parsed.path, m.index, seen);
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
  const groupPrefixes = collectVaporGroupPrefixes(source);
  let m;
  // Chained `app.grouped("api").get("health")` / `api.grouped("v1").get(...)` first so
  // the later verb-head scan does not also claim the trailing `.get(` under a bare receiver.
  SWIFT_VAPOR_GROUPED_CHAIN_RE.lastIndex = 0;
  while ((m = SWIFT_VAPOR_GROUPED_CHAIN_RE.exec(source)) !== null) {
    const recv = m[1];
    if (recv === "router") continue;
    const openIdx = m.index + m[0].length - 1;
    const bal = extractBalancedParenInner(source, openIdx);
    if (!bal) continue;
    const groupSeg = vaporPathFromComponentArgs(bal.inner);
    if (!groupSeg) continue;
    let parentPrefix = "";
    if (recv === "app") parentPrefix = "";
    else if (groupPrefixes.has(recv)) parentPrefix = groupPrefixes.get(recv) ?? "";
    else continue;
    const prefix = joinVaporGroupPath(parentPrefix, groupSeg);
    let i = bal.end + 1;
    while (i < source.length && /\s/.test(source[i])) i += 1;
    if (source[i] !== ".") continue;
    i += 1;
    while (i < source.length && /\s/.test(source[i])) i += 1;
    const verbM = /^(get|post|put|patch|delete|head)\s*\(/i.exec(source.slice(i));
    if (!verbM) continue;
    const verbOpen = i + verbM[0].length - 1;
    const verbBal = extractBalancedParenInner(source, verbOpen);
    if (!verbBal) continue;
    const innerPath = vaporPathFromComponentArgs(verbBal.inner);
    if (!innerPath) continue;
    pushRoute(routes, source, verbM[1], joinVaporGroupPath(prefix, innerPath), m.index, seen);
  }
  SWIFT_VAPOR_VERB_HEAD_RE.lastIndex = 0;
  while ((m = SWIFT_VAPOR_VERB_HEAD_RE.exec(source)) !== null) {
    const recv = m[1];
    if (recv === "router") continue;
    if (recv !== "app" && !groupPrefixes.has(recv)) continue;
    const openIdx = m.index + m[0].length - 1;
    const bal = extractBalancedParenInner(source, openIdx);
    if (!bal) continue;
    let path = vaporPathFromComponentArgs(bal.inner);
    if (!path) continue;
    if (groupPrefixes.has(recv)) {
      path = joinVaporGroupPath(groupPrefixes.get(recv) ?? "", path);
    }
    pushRoute(routes, source, m[2], path, m.index, seen);
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
