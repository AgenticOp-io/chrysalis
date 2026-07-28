/**
 * JavaScript / TypeScript hub ingest v0 (acorn + optional TS strip via typescript).
 * Lowers Express-style routes and simple literal/json-ish returns; everything else is a hole.
 */
import * as acorn from "acorn";
import { simple as walkSimple } from "acorn-walk";
import ts from "typescript";
import { detectHttpRoutesInSource } from "./lift-routes-heuristic.mjs";
import {
  liftElysiaLifecycleMiddlewareToWebir,
  liftExpressMiddlewareToWebir,
  liftIttyPassthroughMiddlewareToWebir,
} from "./hub-express-middleware.mjs";
import { lowerHubStatusOnly } from "./hub-lift-webir-route.mjs";
import {
  extractNestRoutesFromTsSource,
  looksLikeNestControllerSource,
} from "./nestjs-ast-ingest.mjs";

const HTTP_METHODS = new Set(["get", "post", "put", "patch", "delete", "head", "options"]);
/** Restify aliases `del` for DELETE (origin shape — not invented). */
const HTTP_METHOD_ALIASES = new Map([["del", "delete"]]);
/** Includes Adonis `Route.get|post|…` (G10059) alongside Express/Fastify/itty `router`. */
const RECEIVER_NAMES = new Set(["app", "router", "server", "fastify", "Route"]);

const T = {
  string: { kind: "string" },
  int: { kind: "int" },
  float: { kind: "float" },
  bool: { kind: "bool" },
  unknown: { kind: "unknown" },
};

/**
 * @param {string} language
 * @param {string} ext
 */
export function canJavaScriptAstIngest(language, ext) {
  if (language !== "javascript" && language !== "typescript") return false;
  const e = ext.toLowerCase();
  return e === ".js" || e === ".jsx" || e === ".mjs" || e === ".cjs" || e === ".ts" || e === ".tsx";
}

/**
 * @param {string} source
 * @param {string} file
 */
export function parseJavaScriptSource(source, file) {
  const isTs = /\.tsx?$/i.test(file);
  let code = source;
  if (isTs) {
    const out = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
      fileName: file,
    });
    code = out.outputText;
  }
  return acorn.parse(code, {
    ecmaVersion: "latest",
    sourceType: "module",
    allowHashBang: true,
    locations: true,
  });
}

/**
 * @param {{ line: number, column: number }} loc
 * @param {string} file
 */
function originAt(loc, file) {
  return { file, line: loc?.line ?? 1, column: (loc?.column ?? 0) + 1 };
}

/**
 * @param {import('estree').Node} node
 */
function handlerCallback(node) {
  if (!node) return null;
  if (node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression") return node;
  return null;
}

/**
 * @param {import('estree').CallExpression} node
 */
function extractRouteFromCall(node) {
  if (node.callee?.type !== "MemberExpression" || node.callee.computed) return null;
  if (node.callee.property?.type !== "Identifier") return null;
  const rawMethod = node.callee.property.name;
  const method = HTTP_METHOD_ALIASES.get(rawMethod) ?? rawMethod;
  if (!HTTP_METHODS.has(method)) return null;
  const recv = node.callee.object;
  if (recv?.type !== "Identifier" || !RECEIVER_NAMES.has(recv.name)) return null;
  const pathArg = node.arguments[0];
  if (pathArg?.type !== "Literal" || typeof pathArg.value !== "string") return null;
  let fn = null;
  for (let i = 1; i < node.arguments.length; i++) {
    const cb = handlerCallback(node.arguments[i]);
    if (cb) {
      fn = cb;
      break;
    }
  }
  if (!fn) return null;
  return {
    method: method.toUpperCase(),
    // Oak accepts `{id}` URI templates — normalize to `:id` for JS CWL parity (G10043).
    path: normalizeOakBracePathParams(pathArg.value),
    fn,
    loc: node.loc?.start ?? pathArg.loc?.start,
  };
}

/**
 * Object-literal key → string (Identifier or Literal).
 * @param {import('estree').Property} prop
 * @returns {string | null}
 */
function objectPropKeyName(prop) {
  if (prop.type !== "Property" || prop.computed) return null;
  if (prop.key?.type === "Identifier") return prop.key.name;
  if (prop.key?.type === "Literal" && typeof prop.key.value === "string") return prop.key.value;
  return null;
}

/**
 * Hapi `method` property: scalar string or `['GET','POST',…]` array (G10014).
 * @param {import('estree').Expression | null | undefined} value
 * @returns {string[]}
 */
function peelHapiMethodValues(value) {
  if (value?.type === "Literal" && typeof value.value === "string") {
    const m = String(value.value).toUpperCase();
    return HTTP_METHODS.has(m.toLowerCase()) ? [m] : [];
  }
  if (value?.type === "ArrayExpression") {
    /** @type {string[]} */
    const out = [];
    for (const el of value.elements ?? []) {
      if (el?.type === "Literal" && typeof el.value === "string") {
        const m = String(el.value).toUpperCase();
        if (HTTP_METHODS.has(m.toLowerCase())) out.push(m);
      }
    }
    return out;
  }
  return [];
}

/**
 * Peel one Hapi `server.route({ method, path, handler })` config object.
 * `method: ['GET','POST']` expands to one CWL route per method (same handler/path).
 * @param {import('estree').ObjectExpression} obj
 * @param {import('estree').CallExpression} callNode
 * @returns {Array<{ method: string, path: string, fn: import('estree').Function, loc: { line: number, column: number } }>}
 */
function peelHapiRouteObjects(obj, callNode) {
  /** @type {string[]} */
  let methods = [];
  /** @type {string | null} */
  let path = null;
  /** @type {import('estree').Function | null} */
  let fn = null;
  for (const p of obj.properties ?? []) {
    if (p.type !== "Property") continue;
    const key = objectPropKeyName(p);
    if (!key) continue;
    if (key === "method") {
      methods = peelHapiMethodValues(p.value);
    } else if (key === "path") {
      if (p.value?.type === "Literal" && typeof p.value.value === "string") {
        path = p.value.value;
      }
    } else if (key === "handler") {
      fn = handlerCallback(p.value);
    }
  }
  if (methods.length === 0 || !path || !fn) return [];
  const loc = callNode.loc?.start ?? obj.loc?.start ?? { line: 1, column: 0 };
  return methods.map((method) => ({ method, path, fn, loc }));
}

/**
 * Hapi `server.route({…})` or `server.route([{…}, …])`.
 * @param {import('estree').CallExpression} node
 * @returns {Array<{ method: string, path: string, fn: import('estree').Function, loc: { line: number, column: number } }>}
 */
function extractHapiRoutesFromCall(node) {
  if (node.callee?.type !== "MemberExpression" || node.callee.computed) return [];
  if (node.callee.property?.type !== "Identifier" || node.callee.property.name !== "route") return [];
  const recv = node.callee.object;
  if (recv?.type !== "Identifier" || (recv.name !== "server" && recv.name !== "app")) return [];
  const arg = node.arguments[0];
  if (!arg) return [];
  if (arg.type === "ObjectExpression") {
    return peelHapiRouteObjects(arg, node);
  }
  if (arg.type === "ArrayExpression") {
    /** @type {Array<{ method: string, path: string, fn: import('estree').Function, loc: { line: number, column: number } }>} */
    const out = [];
    for (const el of arg.elements ?? []) {
      if (el?.type !== "ObjectExpression") continue;
      out.push(...peelHapiRouteObjects(el, node));
    }
    return out;
  }
  return [];
}

/**
 * Bun.serve dialect marker: `Bun.serve({…})` (G10048 — routes peel only).
 * @param {import('estree').CallExpression} node
 */
function isBunServeCall(node) {
  if (node?.type !== "CallExpression") return false;
  const callee = node.callee;
  if (callee?.type !== "MemberExpression" || callee.computed) return false;
  if (callee.object?.type !== "Identifier" || callee.object.name !== "Bun") return false;
  return callee.property?.type === "Identifier" && callee.property.name === "serve";
}

/**
 * Peel one Bun routes-object entry value:
 * `{ GET: handler, POST: handler }` (preferred) or a bare handler (defaults to GET).
 * Static `Response` / `Bun.file` / named refs stay unpeeled (honest holes).
 * @param {string} path
 * @param {import('estree').Expression} value
 * @param {{ line: number, column: number }} loc
 * @returns {Array<{ method: string, path: string, fn: import('estree').Function, loc: { line: number, column: number } }>}
 */
function peelBunRouteValue(path, value, loc) {
  /** @type {Array<{ method: string, path: string, fn: import('estree').Function, loc: { line: number, column: number } }>} */
  const out = [];
  const fnDirect = handlerCallback(value);
  if (fnDirect) {
    out.push({ method: "GET", path, fn: fnDirect, loc });
    return out;
  }
  if (value?.type !== "ObjectExpression") return out;
  for (const p of value.properties ?? []) {
    if (p.type !== "Property" || p.computed) continue;
    const key = objectPropKeyName(p);
    if (!key) continue;
    const method = key.toUpperCase();
    if (!HTTP_METHODS.has(method.toLowerCase())) continue;
    const fn = handlerCallback(p.value);
    if (!fn) continue;
    out.push({ method, path, fn, loc: p.loc?.start ?? loc });
  }
  return out;
}

/**
 * Bun.serve({ routes: { "/path": { GET: handler }, … } }) — literal path keys only (G10048).
 * fetch fallback / websocket / plugins are not peeled.
 * @param {import('estree').CallExpression} node
 * @returns {Array<{ method: string, path: string, fn: import('estree').Function, loc: { line: number, column: number } }>}
 */
function extractBunServeRoutesFromCall(node) {
  if (!isBunServeCall(node)) return [];
  const opts = node.arguments[0];
  if (opts?.type !== "ObjectExpression") return [];
  /** @type {import('estree').ObjectExpression | null} */
  let routesObj = null;
  for (const p of opts.properties ?? []) {
    if (p.type !== "Property" || p.computed) continue;
    const key = objectPropKeyName(p);
    if (key !== "routes") continue;
    if (p.value?.type === "ObjectExpression") routesObj = p.value;
    break;
  }
  if (!routesObj) return [];
  /** @type {Array<{ method: string, path: string, fn: import('estree').Function, loc: { line: number, column: number } }>} */
  const out = [];
  for (const p of routesObj.properties ?? []) {
    if (p.type !== "Property" || p.computed) continue;
    /** @type {string | null} */
    let path = null;
    if (p.key?.type === "Literal" && typeof p.key.value === "string") path = p.key.value;
    else if (p.key?.type === "Identifier") path = p.key.name.startsWith("/") ? p.key.name : null;
    if (!path || typeof path !== "string" || !path.startsWith("/")) continue;
    const loc = p.loc?.start ?? node.loc?.start ?? { line: 1, column: 0 };
    out.push(...peelBunRouteValue(path, p.value, loc));
  }
  return out;
}

/**
 * Cloudflare Workers `export default { async fetch(request, env, ctx) { … } }` (G10063).
 * Peels literal pathname + method routing only — no KV/D1/env invent (**D6447**).
 * @param {import('estree').Program} ast
 * @returns {import('estree').Function | null}
 */
function findCfWorkersFetchHandler(ast) {
  for (const stmt of ast.body ?? []) {
    if (stmt?.type !== "ExportDefaultDeclaration") continue;
    const decl = stmt.declaration;
    if (decl?.type !== "ObjectExpression") continue;
    for (const p of decl.properties ?? []) {
      if (p.type !== "Property" || p.computed) continue;
      const key = objectPropKeyName(p);
      if (key !== "fetch") continue;
      const fn = handlerCallback(p.value);
      if (fn) return fn;
      if (
        p.value?.type === "FunctionExpression" ||
        p.value?.type === "ArrowFunctionExpression"
      ) {
        return p.value;
      }
    }
  }
  return null;
}

/**
 * Member/ident that yields HTTP method: `request.method` / `req.method` / `method`.
 * @param {import('estree').Expression | null | undefined} expr
 */
function isHttpMethodRef(expr) {
  if (expr?.type === "Identifier" && expr.name === "method") return true;
  if (expr?.type !== "MemberExpression" || expr.computed) return false;
  if (expr.property?.type !== "Identifier" || expr.property.name !== "method") return false;
  return (
    expr.object?.type === "Identifier" &&
    (expr.object.name === "request" || expr.object.name === "req")
  );
}

/**
 * Member/ident that yields URL pathname: `url.pathname` / `pathname` / `path`.
 * @param {import('estree').Expression | null | undefined} expr
 */
function isUrlPathnameRef(expr) {
  if (expr?.type === "Identifier" && (expr.name === "pathname" || expr.name === "path")) {
    return true;
  }
  if (expr?.type !== "MemberExpression" || expr.computed) return false;
  if (expr.property?.type !== "Identifier" || expr.property.name !== "pathname") return false;
  return expr.object?.type === "Identifier" && expr.object.name === "url";
}

/**
 * `left === "GET"` / `"GET" === left` when left is method ref → method string.
 * @param {import('estree').Expression | null | undefined} expr
 * @returns {string | null}
 */
function peelMethodEquality(expr) {
  if (expr?.type !== "BinaryExpression" || expr.operator !== "===") return null;
  const sides = [expr.left, expr.right];
  for (let i = 0; i < 2; i++) {
    const a = sides[i];
    const b = sides[1 - i];
    if (!isHttpMethodRef(a)) continue;
    if (b?.type === "Literal" && typeof b.value === "string") {
      const m = b.value.toUpperCase();
      return HTTP_METHODS.has(m.toLowerCase()) ? m : null;
    }
  }
  return null;
}

/**
 * `left === "/path"` when left is pathname ref → path string.
 * @param {import('estree').Expression | null | undefined} expr
 * @returns {string | null}
 */
function peelPathnameEquality(expr) {
  if (expr?.type !== "BinaryExpression" || expr.operator !== "===") return null;
  const sides = [expr.left, expr.right];
  for (let i = 0; i < 2; i++) {
    const a = sides[i];
    const b = sides[1 - i];
    if (!isUrlPathnameRef(a)) continue;
    if (b?.type === "Literal" && typeof b.value === "string" && b.value.startsWith("/")) {
      return b.value;
    }
  }
  return null;
}

/**
 * `method === "GET" && pathname === "/health"` (either order) → { method, path }.
 * @param {import('estree').Expression | null | undefined} test
 * @returns {{ method: string, path: string } | null}
 */
function peelMethodAndPathTest(test) {
  if (!test) return null;
  if (test.type === "LogicalExpression" && test.operator === "&&") {
    const method = peelMethodEquality(test.left) ?? peelMethodEquality(test.right);
    const path = peelPathnameEquality(test.left) ?? peelPathnameEquality(test.right);
    if (method && path) return { method, path };
    // Nested && (method && path) && other — take first peelable pair only.
    return peelMethodAndPathTest(test.left) ?? peelMethodAndPathTest(test.right);
  }
  return null;
}

/**
 * `` `${request.method} ${url.pathname}` `` / `` `${method} ${path}` `` discriminant.
 * @param {import('estree').Expression | null | undefined} disc
 */
function isMethodPathTemplateDiscriminant(disc) {
  if (disc?.type !== "TemplateLiteral") return false;
  if ((disc.quasis?.length ?? 0) !== 3 || (disc.expressions?.length ?? 0) !== 2) return false;
  const q0 = disc.quasis[0]?.value?.cooked ?? disc.quasis[0]?.value?.raw ?? "";
  const q1 = disc.quasis[1]?.value?.cooked ?? disc.quasis[1]?.value?.raw ?? "";
  const q2 = disc.quasis[2]?.value?.cooked ?? disc.quasis[2]?.value?.raw ?? "";
  if (q0 !== "" || q1 !== " " || q2 !== "") return false;
  return isHttpMethodRef(disc.expressions[0]) && isUrlPathnameRef(disc.expressions[1]);
}

/**
 * Case label `"GET /health"` → { method, path }.
 * @param {string} label
 * @returns {{ method: string, path: string } | null}
 */
function peelMethodPathCaseLabel(label) {
  const m = /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) (\/\S*)$/i.exec(String(label).trim());
  if (!m) return null;
  const method = m[1].toUpperCase();
  if (!HTTP_METHODS.has(method.toLowerCase())) return null;
  return { method, path: m[2] };
}

/**
 * Wrap a return payload as a synthetic handler fn for lowerHandlerBody.
 * @param {import('estree').Expression} payload
 * @param {{ line: number, column: number }} loc
 * @returns {import('estree').ArrowFunctionExpression}
 */
function syntheticReturnHandler(payload, loc) {
  return {
    type: "ArrowFunctionExpression",
    id: null,
    params: [],
    body: payload,
    expression: true,
    generator: false,
    async: false,
    loc: { start: loc, end: loc },
  };
}

/**
 * First `return <expr>` inside a statement list / block (or expression return).
 * @param {import('estree').Statement | import('estree').BlockStatement | null | undefined} node
 * @returns {import('estree').Expression | null}
 */
function firstReturnArgument(node) {
  if (!node) return null;
  if (node.type === "ReturnStatement") return node.argument ?? null;
  if (node.type === "BlockStatement") {
    for (const s of node.body ?? []) {
      const arg = firstReturnArgument(s);
      if (arg) return arg;
    }
    return null;
  }
  if (node.type === "IfStatement") {
    return firstReturnArgument(node.consequent) ?? firstReturnArgument(node.alternate);
  }
  return null;
}

/**
 * Walk if/else-if chain for method+path tests → routes.
 * @param {import('estree').IfStatement} node
 * @param {Array<{ method: string, path: string, fn: import('estree').Function, loc: { line: number, column: number } }>} out
 */
function peelCfWorkersIfRoutes(node, out) {
  let cur = /** @type {import('estree').Statement | null | undefined} */ (node);
  while (cur && cur.type === "IfStatement") {
    const mp = peelMethodAndPathTest(cur.test);
    if (mp) {
      const payload = firstReturnArgument(cur.consequent);
      if (payload) {
        const loc = cur.loc?.start ?? { line: 1, column: 0 };
        out.push({
          method: mp.method,
          path: mp.path,
          fn: syntheticReturnHandler(payload, loc),
          loc,
        });
      }
    } else if (cur.test && peelPathnameEquality(cur.test)) {
      // `if (pathname === "/x") { if (method === "GET") return … }`
      const path = peelPathnameEquality(cur.test);
      const inner = cur.consequent;
      if (path && inner?.type === "BlockStatement") {
        for (const s of inner.body ?? []) {
          if (s.type !== "IfStatement") continue;
          const method = peelMethodEquality(s.test);
          if (!method) continue;
          const payload = firstReturnArgument(s.consequent);
          if (!payload) continue;
          const loc = s.loc?.start ?? { line: 1, column: 0 };
          out.push({
            method,
            path,
            fn: syntheticReturnHandler(payload, loc),
            loc,
          });
        }
      } else if (path && inner?.type === "IfStatement") {
        const method = peelMethodEquality(inner.test);
        const payload = method ? firstReturnArgument(inner.consequent) : null;
        if (method && payload) {
          const loc = inner.loc?.start ?? { line: 1, column: 0 };
          out.push({
            method,
            path,
            fn: syntheticReturnHandler(payload, loc),
            loc,
          });
        }
      }
    } else if (cur.test && peelMethodEquality(cur.test)) {
      const method = peelMethodEquality(cur.test);
      const inner = cur.consequent;
      if (method && inner?.type === "BlockStatement") {
        for (const s of inner.body ?? []) {
          if (s.type !== "IfStatement") continue;
          const path = peelPathnameEquality(s.test);
          if (!path) continue;
          const payload = firstReturnArgument(s.consequent);
          if (!payload) continue;
          const loc = s.loc?.start ?? { line: 1, column: 0 };
          out.push({
            method,
            path,
            fn: syntheticReturnHandler(payload, loc),
            loc,
          });
        }
      }
    }
    cur = cur.alternate;
  }
}

/**
 * `switch (\`${method} ${pathname}\`) { case "GET /health": return … }`
 * @param {import('estree').SwitchStatement} node
 * @param {Array<{ method: string, path: string, fn: import('estree').Function, loc: { line: number, column: number } }>} out
 */
function peelCfWorkersSwitchRoutes(node, out) {
  if (!isMethodPathTemplateDiscriminant(node.discriminant)) {
    // switch (pathname) { case "/health": if (method === "GET") return … }
    if (!isUrlPathnameRef(node.discriminant)) return;
    for (const c of node.cases ?? []) {
      if (!c.test || c.test.type !== "Literal" || typeof c.test.value !== "string") continue;
      const path = c.test.value;
      if (!path.startsWith("/")) continue;
      for (const s of c.consequent ?? []) {
        if (s.type === "IfStatement") {
          const method = peelMethodEquality(s.test);
          const payload = method ? firstReturnArgument(s.consequent) : null;
          if (method && payload) {
            const loc = s.loc?.start ?? c.loc?.start ?? { line: 1, column: 0 };
            out.push({
              method,
              path,
              fn: syntheticReturnHandler(payload, loc),
              loc,
            });
          }
          continue;
        }
        // Bare return under case — method unknown; skip (not peelable cheaply).
      }
    }
    return;
  }
  for (const c of node.cases ?? []) {
    if (!c.test || c.test.type !== "Literal" || typeof c.test.value !== "string") continue;
    const mp = peelMethodPathCaseLabel(c.test.value);
    if (!mp) continue;
    const payload = firstReturnArgument({
      type: "BlockStatement",
      body: c.consequent ?? [],
    });
    if (!payload) continue;
    const loc = c.loc?.start ?? { line: 1, column: 0 };
    out.push({
      method: mp.method,
      path: mp.path,
      fn: syntheticReturnHandler(payload, loc),
      loc,
    });
  }
}

/**
 * Peel Cloudflare Workers fetch-export routes (G10063).
 * Only `export default { fetch }` — does not steal Bun.serve `fetch` fallback (Identifier export).
 * @param {import('estree').Program} ast
 * @returns {Array<{ method: string, path: string, fn: import('estree').Function, loc: { line: number, column: number } }>}
 */
function extractCfWorkersFetchRoutes(ast) {
  const fetchFn = findCfWorkersFetchHandler(ast);
  if (!fetchFn) return [];
  const body = fetchFn.body;
  if (body?.type !== "BlockStatement") return [];
  /** @type {Array<{ method: string, path: string, fn: import('estree').Function, loc: { line: number, column: number } }>} */
  const out = [];
  for (const s of body.body ?? []) {
    if (s.type === "IfStatement") peelCfWorkersIfRoutes(s, out);
    else if (s.type === "SwitchStatement") peelCfWorkersSwitchRoutes(s, out);
  }
  return out;
}

/**
 * `Response.json(body, { status: N })` → status N (Bun / Fetch ResponseInit — G10048).
 * @param {import('estree').Expression | null | undefined} expr
 * @returns {number | null}
 */
function extractResponseJsonInitStatus(expr) {
  let cur = expr;
  while (cur && cur.type === "CallExpression") {
    const callee = cur.callee;
    if (
      callee?.type === "MemberExpression" &&
      !callee.computed &&
      callee.property?.type === "Identifier" &&
      callee.property.name === "json" &&
      callee.object?.type === "Identifier" &&
      callee.object.name === "Response"
    ) {
      const init = cur.arguments[1];
      if (init?.type === "ObjectExpression") {
        for (const p of init.properties ?? []) {
          if (p.type !== "Property" || p.computed) continue;
          const key = objectPropKeyName(p);
          if (key !== "status") continue;
          if (p.value?.type === "Literal" && typeof p.value.value === "number") {
            return p.value.value;
          }
        }
      }
      break;
    }
    if (callee?.type !== "MemberExpression" || callee.computed) break;
    cur = callee.object;
  }
  return null;
}

/**
 * Hapi `h.response(value)` / `reply.response(value)` (optionally chained `.code(N)`).
 * @param {import('estree').Expression} expr
 * @returns {import('estree').Expression | null}
 */
function peelHapiResponseArgument(expr) {
  let cur = expr;
  while (cur && cur.type === "CallExpression") {
    const callee = cur.callee;
    if (
      callee?.type !== "MemberExpression" ||
      callee.computed ||
      callee.property?.type !== "Identifier"
    ) {
      break;
    }
    if (
      callee.property.name === "response" &&
      callee.object?.type === "Identifier" &&
      (callee.object.name === "h" || callee.object.name === "reply")
    ) {
      return cur.arguments[0] ?? null;
    }
    cur = callee.object;
  }
  return null;
}

/**
 * @param {import('estree').Function} fn
 * @returns {import('estree').Expression | null}
 */
function hapiResponsePayloadExpression(fn) {
  const expr = extractHandlerExpression(fn);
  if (expr?.type === "CallExpression") {
    const peeled = peelHapiResponseArgument(expr);
    if (peeled) return peeled;
  }
  const body = fn.body;
  if (body.type === "BlockStatement") {
    for (const s of body.body) {
      if (s.type === "ReturnStatement" && s.argument?.type === "CallExpression") {
        const peeled = peelHapiResponseArgument(s.argument);
        if (peeled) return peeled;
      }
      if (s.type === "ExpressionStatement" && s.expression?.type === "CallExpression") {
        const peeled = peelHapiResponseArgument(s.expression);
        if (peeled) return peeled;
      }
    }
  }
  return null;
}

/**
 * @param {import('estree').ObjectExpression} expr
 */
function lowerObjectExpression(ctx, expr, origin) {
  const { data, webir } = ctx;
  const props = expr.properties ?? [];
  if (props.length === 0) {
    return data.call({
      callee: "__object_literal",
      args: [],
      type: T.unknown,
      origin,
      provenance: [webir.provenance("hub-ingest", "javascript-ast:object")],
    });
  }
  const flat = [];
  for (const p of props) {
    if (p.type !== "Property" || p.computed) {
      return data.hole({
        reason: "hub-js:object-literal",
        input: T.unknown,
        output: T.unknown,
        origin,
        provenance: [webir.provenance("hub-ingest", "javascript-ast")],
      });
    }
    const key =
      p.key?.type === "Identifier"
        ? p.key.name
        : p.key?.type === "Literal" && typeof p.key.value === "string"
          ? p.key.value
          : null;
    if (!key) {
      return data.hole({
        reason: "hub-js:object-literal",
        input: T.unknown,
        output: T.unknown,
        origin,
        provenance: [webir.provenance("hub-ingest", "javascript-ast")],
      });
    }
    flat.push(
      data.literal({
        value: key,
        type: T.string,
        origin,
        provenance: [webir.provenance("hub-ingest", "javascript-ast:object-key")],
      }),
    );
    flat.push(lowerExpression(ctx, p.value));
  }
  return data.call({
    callee: "__object_literal",
    args: flat,
    type: T.unknown,
    origin,
    provenance: [webir.provenance("hub-ingest", "javascript-ast:object")],
  });
}

/**
 * @param {import('estree').MemberExpression} expr
 * @returns {string | null}
 */
function memberPropName(expr) {
  if (!expr.computed && expr.property?.type === "Identifier") return expr.property.name;
  if (expr.computed && expr.property?.type === "Literal" && typeof expr.property.value === "string") {
    return expr.property.value;
  }
  return null;
}

/**
 * Detect an Express/Fastify/Koa/Hapi request-field access:
 * - `<req|request>.params|query|body|payload|headers|cookies.<name>`
 * - `ctx.params|query.<name>` (Koa)
 * - `ctx.request.body|headers|query.<name>` (Koa nested request)
 * - Hapi `request.payload.<name>` → body
 * - `params.<name>` shorthand
 * Returns the WebIR request field source and field name, or null.
 * @param {import('estree').MemberExpression} expr
 * @returns {{ source: "path" | "query" | "body" | "header" | "cookie", name: string } | null}
 */
function requestFieldOf(expr) {
  if (expr.type !== "MemberExpression") return null;
  const name = memberPropName(expr);
  if (!name) return null;

  if (expr.object?.type === "Identifier" && expr.object.name === "params") {
    return { source: "path", name };
  }

  const bucketMap = {
    params: "path",
    query: "query",
    body: "body",
    payload: "body", // Hapi
    headers: "header",
    cookies: "cookie",
  };

  if (expr.object?.type === "MemberExpression") {
    const bucketName =
      !expr.object.computed && expr.object.property?.type === "Identifier"
        ? expr.object.property.name
        : null;
    const recv = expr.object.object;
    const recvName = recv?.type === "Identifier" ? recv.name : null;
    // Express `req.*` and Fastify `request.*` (same request-field bags).
    if (bucketName && bucketMap[bucketName] && (recvName === "req" || recvName === "request")) {
      return { source: bucketMap[bucketName], name };
    }
    // Koa `ctx.params.id` / `ctx.query.q` (params/query live on ctx).
    if (bucketName && bucketMap[bucketName] && recvName === "ctx") {
      return { source: bucketMap[bucketName], name };
    }
    // Koa `ctx.request.body.x` / `ctx.request.headers.x` / `ctx.request.query.x`.
    if (
      bucketName &&
      bucketMap[bucketName] &&
      recv?.type === "MemberExpression" &&
      !recv.computed &&
      recv.property?.type === "Identifier" &&
      recv.property.name === "request" &&
      recv.object?.type === "Identifier" &&
      recv.object.name === "ctx"
    ) {
      return { source: bucketMap[bucketName], name };
    }
  }
  return null;
}

/**
 * Koa `ctx.body = value` or Oak `ctx.response.body = value` → response payload.
 * @param {import('estree').Expression | null | undefined} expr
 */
function peelCtxBodyAssignment(expr) {
  if (expr?.type !== "AssignmentExpression" || expr.operator !== "=") return null;
  const left = expr.left;
  if (left?.type !== "MemberExpression" || left.computed) return null;
  if (left.property?.type !== "Identifier" || left.property.name !== "body") return null;
  // Koa: `ctx.body = …`
  if (left.object?.type === "Identifier" && left.object.name === "ctx") {
    return expr.right ?? null;
  }
  // Oak (G10043): `ctx.response.body = …`
  if (
    left.object?.type === "MemberExpression" &&
    !left.object.computed &&
    left.object.property?.type === "Identifier" &&
    left.object.property.name === "response" &&
    left.object.object?.type === "Identifier" &&
    left.object.object.name === "ctx"
  ) {
    return expr.right ?? null;
  }
  return null;
}

/**
 * Koa `ctx.status = N` or Oak `ctx.response.status = N` → HTTP status code.
 * @param {import('estree').Expression | null | undefined} expr
 * @returns {number | null}
 */
function peelCtxStatusAssignment(expr) {
  if (expr?.type !== "AssignmentExpression" || expr.operator !== "=") return null;
  const left = expr.left;
  if (left?.type !== "MemberExpression" || left.computed) return null;
  if (left.property?.type !== "Identifier" || left.property.name !== "status") return null;
  let isCtxStatus = false;
  // Koa: `ctx.status = N`
  if (left.object?.type === "Identifier" && left.object.name === "ctx") {
    isCtxStatus = true;
  }
  // Oak (G10043): `ctx.response.status = N`
  if (
    left.object?.type === "MemberExpression" &&
    !left.object.computed &&
    left.object.property?.type === "Identifier" &&
    left.object.property.name === "response" &&
    left.object.object?.type === "Identifier" &&
    left.object.object.name === "ctx"
  ) {
    isCtxStatus = true;
  }
  if (!isCtxStatus) return null;
  const right = expr.right;
  if (right?.type === "Literal" && typeof right.value === "number") return right.value;
  return null;
}

/**
 * Scan a Koa handler for `ctx.status = N` (any statement).
 * @param {import('estree').Function} fn
 * @returns {number | null}
 */
function extractCtxStatus(fn) {
  const body = fn.body;
  if (body?.type !== "BlockStatement") {
    return peelCtxStatusAssignment(body?.type === "AssignmentExpression" ? body : null);
  }
  for (const s of body.body) {
    if (s.type === "ExpressionStatement") {
      const status = peelCtxStatusAssignment(s.expression);
      if (status !== null) return status;
    }
  }
  return null;
}

/**
 * Scan a Koa handler for `ctx.body = value` payload.
 * @param {import('estree').Function} fn
 * @returns {import('estree').Expression | null}
 */
function ctxBodyPayloadExpression(fn) {
  const body = fn.body;
  if (body?.type === "AssignmentExpression") {
    return peelCtxBodyAssignment(body);
  }
  if (body?.type !== "BlockStatement") return null;
  /** @type {import('estree').Expression | null} */
  let last = null;
  for (const s of body.body) {
    if (s.type !== "ExpressionStatement") continue;
    const peeled = peelCtxBodyAssignment(s.expression);
    if (peeled) last = peeled;
  }
  return last;
}

/**
 * Express `req.get("Header-Name")` → header request field.
 * @param {import('estree').CallExpression} expr
 */
function reqGetHeaderFieldOf(expr) {
  if (expr.type !== "CallExpression") return null;
  const callee = expr.callee;
  if (
    callee?.type !== "MemberExpression" ||
    callee.computed ||
    callee.property?.type !== "Identifier" ||
    callee.property.name !== "get"
  ) {
    return null;
  }
  if (callee.object?.type !== "Identifier" || callee.object.name !== "req") return null;
  const arg = expr.arguments[0];
  if (arg?.type !== "Literal" || typeof arg.value !== "string") return null;
  return { name: arg.value };
}

/**
 * Adonis `request.param("id")` → path request field (G10059).
 * Does not invent Lucid / IoC / controller string refs.
 * @param {import('estree').CallExpression} expr
 * @returns {{ source: "path", name: string } | null}
 */
function adonisRequestParamFieldOf(expr) {
  if (expr.type !== "CallExpression") return null;
  const callee = expr.callee;
  if (
    callee?.type !== "MemberExpression" ||
    callee.computed ||
    callee.property?.type !== "Identifier" ||
    callee.property.name !== "param"
  ) {
    return null;
  }
  if (callee.object?.type !== "Identifier" || callee.object.name !== "request") return null;
  const arg = expr.arguments[0];
  if (arg?.type !== "Literal" || typeof arg.value !== "string") return null;
  return { source: "path", name: arg.value };
}

/**
 * Adonis `request.qs().q` / `request.qs()['q']` → query request field (G10059).
 * @param {import('estree').MemberExpression} expr
 * @returns {{ source: "query", name: string } | null}
 */
function adonisQsMemberFieldOf(expr) {
  if (expr.type !== "MemberExpression") return null;
  const call = expr.object;
  if (call?.type !== "CallExpression") return null;
  const callee = call.callee;
  if (
    callee?.type !== "MemberExpression" ||
    callee.computed ||
    callee.property?.type !== "Identifier" ||
    callee.property.name !== "qs"
  ) {
    return null;
  }
  if (callee.object?.type !== "Identifier" || callee.object.name !== "request") return null;
  if (call.arguments?.length) return null;
  const name = memberPropName(expr);
  if (!name) return null;
  return { source: "query", name };
}

/**
 * Adonis import marker: `@adonisjs/…` (G10059 — dialect tag only).
 * @param {import('estree').ImportDeclaration} node
 */
function isAdonisImportSource(node) {
  const src = node?.source?.value;
  return typeof src === "string" && src.includes("adonisjs");
}

/**
 * Hono `c.req.param("id")` / `c.req.query("q")` → path/query request field (G10019).
 * @param {import('estree').CallExpression} expr
 * @returns {{ source: "path" | "query", name: string } | null}
 */
function honoReqFieldOf(expr) {
  if (expr.type !== "CallExpression") return null;
  const callee = expr.callee;
  if (
    callee?.type !== "MemberExpression" ||
    callee.computed ||
    callee.property?.type !== "Identifier"
  ) {
    return null;
  }
  const method = callee.property.name;
  if (method !== "param" && method !== "query") return null;
  const req = callee.object;
  if (
    req?.type !== "MemberExpression" ||
    req.computed ||
    req.property?.type !== "Identifier" ||
    req.property.name !== "req" ||
    req.object?.type !== "Identifier" ||
    req.object.name !== "c"
  ) {
    return null;
  }
  const arg = expr.arguments[0];
  if (arg?.type !== "Literal" || typeof arg.value !== "string") return null;
  return { source: method === "param" ? "path" : "query", name: arg.value };
}

/**
 * Hono origin factory: `new Hono()` / `new Hono<…>()` (G10019 — dialect marker only).
 * @param {import('estree').Expression | null | undefined} expr
 */
function isHonoNewExpression(expr) {
  if (expr?.type !== "NewExpression") return false;
  const callee = expr.callee;
  if (callee?.type === "Identifier" && callee.name === "Hono") return true;
  // TS transpile may leave `new Hono()` as Identifier; generics strip to same.
  return false;
}

/**
 * Elysia origin factory: `new Elysia()` / `new Elysia({…})` (G10025 — dialect marker only).
 * @param {import('estree').Expression | null | undefined} expr
 */
function isElysiaNewExpression(expr) {
  if (expr?.type !== "NewExpression") return false;
  const callee = expr.callee;
  return callee?.type === "Identifier" && callee.name === "Elysia";
}

/**
 * Oak (Deno) origin factory: `new Application()` (G10043 — dialect marker only).
 * @param {import('estree').Expression | null | undefined} expr
 */
function isOakApplicationNewExpression(expr) {
  if (expr?.type !== "NewExpression") return false;
  const callee = expr.callee;
  return callee?.type === "Identifier" && callee.name === "Application";
}

/**
 * itty-router origin factory: `Router()` / `Router({…})` (G10047 — dialect marker only).
 * CallExpression only — do not confuse with Oak `new Router()` (NewExpression).
 * @param {import('estree').Expression | null | undefined} expr
 */
function isIttyRouterCallExpression(expr) {
  if (expr?.type !== "CallExpression") return false;
  const callee = expr.callee;
  return callee?.type === "Identifier" && callee.name === "Router";
}

/**
 * Workers / itty `ResponseInit`: `{ status: N }` → HTTP status (G10047).
 * Does not peel Hono `c.json(body, { status })` — that stays an honest hole (G10019).
 * @param {import('estree').Expression | null | undefined} expr
 * @returns {number | null}
 */
function peelResponseInitStatus(expr) {
  if (expr?.type !== "ObjectExpression") return null;
  for (const p of expr.properties ?? []) {
    if (p.type !== "Property" || p.computed) continue;
    const key =
      p.key?.type === "Identifier"
        ? p.key.name
        : p.key?.type === "Literal" && typeof p.key.value === "string"
          ? p.key.value
          : null;
    if (key !== "status") continue;
    if (p.value?.type === "Literal" && typeof p.value.value === "number") return p.value.value;
  }
  return null;
}

/**
 * Workers `new Response(body, init?)` — literal / JSON.stringify body + optional status (G10047).
 * @param {import('estree').Expression | null | undefined} expr
 * @returns {{ payload: import('estree').Expression | null, status: number | null, usedStringify: boolean } | null}
 */
function peelNewResponseExpression(expr) {
  if (expr?.type !== "NewExpression") return null;
  if (expr.callee?.type !== "Identifier" || expr.callee.name !== "Response") return null;
  const bodyArg = expr.arguments[0] ?? null;
  const status = peelResponseInitStatus(expr.arguments[1] ?? null);
  if (!bodyArg) return { payload: null, status, usedStringify: false };
  const stringified = peelJsonStringifyArgument(bodyArg);
  if (stringified) return { payload: stringified, status, usedStringify: true };
  return { payload: bodyArg, status, usedStringify: false };
}

/**
 * Normalize Oak/URI `{id}` path templates to Express-style `:id` (G10043).
 * Leaves existing `:id` paths unchanged.
 * @param {string} path
 */
function normalizeOakBracePathParams(path) {
  return String(path).replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, ":$1");
}

/**
 * Elysia `ctx.set.status = N` → HTTP status (nested `set` bag on context).
 * @param {import('estree').Expression | null | undefined} expr
 * @returns {number | null}
 */
function peelElysiaSetStatusAssignment(expr) {
  if (expr?.type !== "AssignmentExpression" || expr.operator !== "=") return null;
  const left = expr.left;
  if (left?.type !== "MemberExpression" || left.computed) return null;
  if (left.property?.type !== "Identifier" || left.property.name !== "status") return null;
  const setBag = left.object;
  if (
    setBag?.type !== "MemberExpression" ||
    setBag.computed ||
    setBag.property?.type !== "Identifier" ||
    setBag.property.name !== "set" ||
    setBag.object?.type !== "Identifier" ||
    setBag.object.name !== "ctx"
  ) {
    return null;
  }
  const right = expr.right;
  if (right?.type === "Literal" && typeof right.value === "number") return right.value;
  return null;
}

/**
 * Scan handler for Elysia `ctx.set.status = N`.
 * @param {import('estree').Function} fn
 * @returns {number | null}
 */
function extractElysiaSetStatus(fn) {
  const body = fn.body;
  if (body?.type !== "BlockStatement") {
    return peelElysiaSetStatusAssignment(body?.type === "AssignmentExpression" ? body : null);
  }
  for (const s of body.body) {
    if (s.type === "ExpressionStatement") {
      const status = peelElysiaSetStatusAssignment(s.expression);
      if (status !== null) return status;
    }
  }
  return null;
}

/**
 * Hono `c.text(value)` / `c.text(value, status)` → text payload argument.
 * @param {import('estree').Expression | null | undefined} expr
 * @returns {import('estree').Expression | null}
 */
function peelHonoTextArgument(expr) {
  if (expr?.type !== "CallExpression") return null;
  const callee = expr.callee;
  if (
    callee?.type !== "MemberExpression" ||
    callee.computed ||
    callee.property?.type !== "Identifier" ||
    callee.property.name !== "text"
  ) {
    return null;
  }
  if (callee.object?.type !== "Identifier" || callee.object.name !== "c") return null;
  return expr.arguments[0] ?? null;
}

/**
 * Scan handler for Hono `c.text(...)` payload.
 * @param {import('estree').Function} fn
 * @returns {import('estree').Expression | null}
 */
function honoTextPayloadExpression(fn) {
  const expr = extractHandlerExpression(fn);
  if (expr?.type === "CallExpression") {
    const peeled = peelHonoTextArgument(expr);
    if (peeled) return peeled;
  }
  const body = fn.body;
  if (body?.type === "BlockStatement") {
    for (const s of body.body) {
      if (s.type === "ReturnStatement" && s.argument?.type === "CallExpression") {
        const peeled = peelHonoTextArgument(s.argument);
        if (peeled) return peeled;
      }
      if (s.type === "ExpressionStatement" && s.expression?.type === "CallExpression") {
        const peeled = peelHonoTextArgument(s.expression);
        if (peeled) return peeled;
      }
    }
  }
  return null;
}

/**
 * SvelteKit / Next: `url.searchParams.get("q")`.
 * Oak (G10043): `ctx.request.url.searchParams.get("q")`.
 * Bun (G10048) / itty (G10047): `new URL(req|request.url).searchParams.get("q")`.
 * @param {import('estree').CallExpression} expr
 */
function urlSearchParamsGetFieldOf(expr) {
  if (expr.type !== "CallExpression") return null;
  const callee = expr.callee;
  if (callee?.type !== "MemberExpression" || callee.computed || callee.property?.type !== "Identifier") {
    return null;
  }
  if (callee.property.name !== "get") return null;
  const searchParams = callee.object;
  if (
    searchParams?.type !== "MemberExpression" ||
    searchParams.computed ||
    searchParams.property?.type !== "Identifier" ||
    searchParams.property.name !== "searchParams"
  ) {
    return null;
  }
  const urlNode = searchParams.object;
  // SvelteKit / Next: bare `url.searchParams.get(…)`
  if (urlNode?.type === "Identifier" && urlNode.name === "url") {
    const arg = expr.arguments[0];
    if (arg?.type !== "Literal" || typeof arg.value !== "string") return null;
    return { name: arg.value };
  }
  // Oak: `ctx.request.url.searchParams.get(…)`
  if (
    urlNode?.type === "MemberExpression" &&
    !urlNode.computed &&
    urlNode.property?.type === "Identifier" &&
    urlNode.property.name === "url" &&
    urlNode.object?.type === "MemberExpression" &&
    !urlNode.object.computed &&
    urlNode.object.property?.type === "Identifier" &&
    urlNode.object.property.name === "request" &&
    urlNode.object.object?.type === "Identifier" &&
    urlNode.object.object.name === "ctx"
  ) {
    const arg = expr.arguments[0];
    if (arg?.type !== "Literal" || typeof arg.value !== "string") return null;
    return { name: arg.value };
  }
  // Bun (G10048): `new URL(req.url).searchParams.get(…)`
  // itty / Workers (G10047): `new URL(request.url).searchParams.get(…)`
  if (
    urlNode?.type === "NewExpression" &&
    urlNode.callee?.type === "Identifier" &&
    urlNode.callee.name === "URL" &&
    urlNode.arguments?.[0]?.type === "MemberExpression" &&
    !urlNode.arguments[0].computed &&
    urlNode.arguments[0].object?.type === "Identifier" &&
    (urlNode.arguments[0].object.name === "req" ||
      urlNode.arguments[0].object.name === "request") &&
    urlNode.arguments[0].property?.type === "Identifier" &&
    urlNode.arguments[0].property.name === "url"
  ) {
    const arg = expr.arguments[0];
    if (arg?.type !== "Literal" || typeof arg.value !== "string") return null;
    return { name: arg.value };
  }
  return null;
}

/**
 * Nitro/h3: `getRouterParam(event, "id")` → path request field.
 * @param {import('estree').CallExpression} expr
 * @returns {{ name: string } | null}
 */
function h3GetRouterParamFieldOf(expr) {
  if (expr.type !== "CallExpression") return null;
  if (expr.callee?.type !== "Identifier" || expr.callee.name !== "getRouterParam") return null;
  const nameArg = expr.arguments[1];
  if (nameArg?.type !== "Literal" || typeof nameArg.value !== "string") return null;
  return { name: nameArg.value };
}

/**
 * Nitro/h3: `getQuery(event).q` → query request field.
 * @param {import('estree').MemberExpression} expr
 * @returns {{ name: string } | null}
 */
function h3GetQueryMemberFieldOf(expr) {
  if (expr.type !== "MemberExpression") return null;
  const name = memberPropName(expr);
  if (!name) return null;
  const obj = expr.object;
  if (obj?.type !== "CallExpression") return null;
  if (obj.callee?.type !== "Identifier" || obj.callee.name !== "getQuery") return null;
  return { name };
}

/**
 * Peel `await` so `await readBody(event)` matches `readBody(event)`.
 * @param {import('estree').Expression | null | undefined} expr
 */
function peelAwaitExpression(expr) {
  if (expr?.type === "AwaitExpression") return expr.argument ?? null;
  return expr ?? null;
}

/**
 * Nitro/h3: `readBody(event)` / `await readBody(event)` call.
 * @param {import('estree').Expression | null | undefined} expr
 * @returns {import('estree').CallExpression | null}
 */
function h3ReadBodyCallOf(expr) {
  const call = peelAwaitExpression(expr);
  if (call?.type !== "CallExpression") return null;
  if (call.callee?.type !== "Identifier" || call.callee.name !== "readBody") return null;
  return call;
}

/**
 * Nitro/h3: `(await) readBody(event).name` → body request field.
 * @param {import('estree').MemberExpression} expr
 * @returns {{ name: string } | null}
 */
function h3ReadBodyMemberFieldOf(expr) {
  if (expr.type !== "MemberExpression") return null;
  const name = memberPropName(expr);
  if (!name) return null;
  if (!h3ReadBodyCallOf(expr.object)) return null;
  return { name };
}

/**
 * Nitro/h3: `getHeader(event, "x")` / `getRequestHeader(event, "x")` → header field.
 * @param {import('estree').CallExpression} expr
 * @returns {{ name: string } | null}
 */
function h3GetHeaderFieldOf(expr) {
  if (expr.type !== "CallExpression") return null;
  if (expr.callee?.type !== "Identifier") return null;
  if (expr.callee.name !== "getHeader" && expr.callee.name !== "getRequestHeader") return null;
  const nameArg = expr.arguments[1];
  if (nameArg?.type !== "Literal" || typeof nameArg.value !== "string") return null;
  return { name: nameArg.value };
}

/**
 * Nitro/h3: `getCookie(event, "sid")` → cookie field.
 * @param {import('estree').CallExpression} expr
 * @returns {{ name: string } | null}
 */
function h3GetCookieFieldOf(expr) {
  if (expr.type !== "CallExpression") return null;
  if (expr.callee?.type !== "Identifier" || expr.callee.name !== "getCookie") return null;
  const nameArg = expr.arguments[1];
  if (nameArg?.type !== "Literal" || typeof nameArg.value !== "string") return null;
  return { name: nameArg.value };
}

/**
 * @typedef {{ source: "path" | "query" | "body" | "header" | "cookie", name: string }} RequestFieldBinding
 */

/**
 * If `expr` is `ctx.params|query`, `req.params|query|body`, `request.params|query|payload`,
 * or Koa `ctx.request.body|query|headers`, return the WebIR request source bucket.
 * @param {import('estree').Expression | null | undefined} expr
 * @returns {"path" | "query" | "body" | "header" | "cookie" | null}
 */
function requestBucketSourceOf(expr) {
  if (expr?.type !== "MemberExpression") return null;
  const bucketMap = {
    params: "path",
    query: "query",
    body: "body",
    payload: "body",
    headers: "header",
    cookies: "cookie",
  };

  if (expr.object?.type === "Identifier") {
    const recv = expr.object.name;
    if (recv !== "ctx" && recv !== "req" && recv !== "request") return null;
    if (expr.computed || expr.property?.type !== "Identifier") return null;
    return bucketMap[expr.property.name] ?? null;
  }

  if (
    expr.object?.type === "MemberExpression" &&
    !expr.object.computed &&
    expr.object.property?.type === "Identifier" &&
    expr.object.property.name === "request" &&
    expr.object.object?.type === "Identifier" &&
    expr.object.object.name === "ctx"
  ) {
    if (expr.computed || expr.property?.type !== "Identifier") return null;
    return bucketMap[expr.property.name] ?? null;
  }

  return null;
}

/**
 * Peel IDENT-safe fields from an ObjectPattern into request-field bindings.
 * @param {import('estree').ObjectPattern} pattern
 * @param {"path" | "query" | "body" | "header" | "cookie"} source
 * @param {Map<string, RequestFieldBinding>} bindings
 */
function collectIdentFieldsFromObjectPattern(pattern, source, bindings) {
  for (const prop of pattern.properties) {
    if (prop.type === "RestElement") continue;
    if (prop.type !== "Property" || prop.computed) continue;
    /** @type {string | null} */
    let fieldName = null;
    if (prop.key?.type === "Identifier") fieldName = prop.key.name;
    else if (prop.key?.type === "Literal" && typeof prop.key.value === "string") {
      fieldName = prop.key.value;
    }
    if (!fieldName) continue;
    /** @type {import('estree').Pattern | null | undefined} */
    let local = prop.value;
    if (local?.type === "AssignmentPattern") local = local.left;
    if (local?.type === "Identifier") {
      bindings.set(local.name, { source, name: fieldName });
    }
  }
}

/**
 * Elysia / Bun-style handler param bags (G10025, reuses G10005 IDENT rules):
 * `({ params: { id } })` / `({ query: { q = "" } })`.
 * Nested ObjectPattern under params|query|body|payload|headers|cookies only.
 * @param {import('estree').Function} fn
 * @param {Map<string, RequestFieldBinding>} bindings
 */
function collectHandlerParamBagBindings(fn, bindings) {
  const bucketMap = {
    params: "path",
    query: "query",
    body: "body",
    payload: "body",
    headers: "header",
    cookies: "cookie",
  };
  for (const param of fn.params ?? []) {
    if (param?.type !== "ObjectPattern") continue;
    for (const prop of param.properties) {
      if (prop.type === "RestElement") continue;
      if (prop.type !== "Property" || prop.computed) continue;
      const bucketKey =
        prop.key?.type === "Identifier"
          ? prop.key.name
          : prop.key?.type === "Literal" && typeof prop.key.value === "string"
            ? prop.key.value
            : null;
      if (!bucketKey || !bucketMap[bucketKey]) continue;
      let inner = prop.value;
      if (inner?.type === "AssignmentPattern") inner = inner.left;
      if (inner?.type !== "ObjectPattern") continue;
      collectIdentFieldsFromObjectPattern(inner, bucketMap[bucketKey], bindings);
    }
  }
}

/**
 * Collect IDENT-safe destructure from params/query/payload/body at handler top:
 * `const { id } = ctx.params` / `request.query` / `req.params` / etc.
 * Also Elysia handler param bags: `({ params: { id } })` (G10025).
 * @param {import('estree').Function} fn
 * @returns {Map<string, RequestFieldBinding>}
 */
function collectRequestDestructuringBindings(fn) {
  /** @type {Map<string, RequestFieldBinding>} */
  const bindings = new Map();
  collectHandlerParamBagBindings(fn, bindings);
  const body = fn.body;
  if (body?.type !== "BlockStatement") return bindings;
  for (const s of body.body) {
    if (s.type !== "VariableDeclaration") continue;
    for (const d of s.declarations) {
      const source = requestBucketSourceOf(d.init);
      if (!source) continue;
      if (d.id?.type !== "ObjectPattern") continue;
      collectIdentFieldsFromObjectPattern(d.id, source, bindings);
    }
  }
  return bindings;
}

/**
 * Identifier from `const { x } = ctx.params` (or req/request/payload/query peel).
 * @param {import('estree').Identifier} expr
 * @param {Map<string, RequestFieldBinding> | undefined} bindings
 * @returns {RequestFieldBinding | null}
 */
function destructuredRequestFieldOf(expr, bindings) {
  if (!bindings || bindings.size === 0) return null;
  if (expr.type !== "Identifier") return null;
  return bindings.get(expr.name) ?? null;
}

/**
 * @typedef {{ kind: "whole" } | { kind: "field", name: string }} H3BodyBinding
 */

/**
 * Collect Nitro `readBody` bindings:
 * - `const body = (await) readBody(event)` → whole (member `.x` peel)
 * - `const { x, y: z } = (await) readBody(event)` → field locals
 * @param {import('estree').Function} fn
 * @returns {Map<string, H3BodyBinding>}
 */
function collectH3ReadBodyBindings(fn) {
  /** @type {Map<string, H3BodyBinding>} */
  const bindings = new Map();
  const body = fn.body;
  if (body?.type !== "BlockStatement") return bindings;
  for (const s of body.body) {
    if (s.type !== "VariableDeclaration") continue;
    for (const d of s.declarations) {
      if (!h3ReadBodyCallOf(d.init)) continue;
      if (d.id?.type === "Identifier") {
        bindings.set(d.id.name, { kind: "whole" });
        continue;
      }
      if (d.id?.type !== "ObjectPattern") continue;
      for (const prop of d.id.properties) {
        if (prop.type === "RestElement") continue;
        if (prop.type !== "Property" || prop.computed) continue;
        /** @type {string | null} */
        let fieldName = null;
        if (prop.key?.type === "Identifier") fieldName = prop.key.name;
        else if (prop.key?.type === "Literal" && typeof prop.key.value === "string") {
          fieldName = prop.key.value;
        }
        if (!fieldName) continue;
        /** @type {import('estree').Pattern | null | undefined} */
        let local = prop.value;
        if (local?.type === "AssignmentPattern") local = local.left;
        if (local?.type === "Identifier") {
          bindings.set(local.name, { kind: "field", name: fieldName });
        }
      }
    }
  }
  return bindings;
}

/**
 * Nitro/h3: `body.x` after `const body = await readBody(event)`.
 * @param {import('estree').MemberExpression} expr
 * @param {Map<string, H3BodyBinding> | undefined} bindings
 * @returns {{ name: string } | null}
 */
function h3BoundBodyMemberFieldOf(expr, bindings) {
  if (!bindings || bindings.size === 0) return null;
  if (expr.type !== "MemberExpression") return null;
  if (expr.object?.type !== "Identifier") return null;
  if (bindings.get(expr.object.name)?.kind !== "whole") return null;
  const name = memberPropName(expr);
  return name ? { name } : null;
}

/**
 * Nitro/h3: identifier from `const { x } = await readBody(event)`.
 * @param {import('estree').Identifier} expr
 * @param {Map<string, H3BodyBinding> | undefined} bindings
 * @returns {{ name: string } | null}
 */
function h3DestructuredBodyFieldOf(expr, bindings) {
  if (!bindings || bindings.size === 0) return null;
  if (expr.type !== "Identifier") return null;
  const b = bindings.get(expr.name);
  if (b?.kind !== "field") return null;
  return { name: b.name };
}

/**
 * Nitro/h3: `setResponseStatus(event, N)` → status code.
 * @param {import('estree').Function} fn
 * @returns {number | null}
 */
function extractSetResponseStatus(fn) {
  const body = fn.body;
  if (body?.type !== "BlockStatement") return null;
  for (const s of body.body) {
    const call =
      s.type === "ExpressionStatement" && s.expression?.type === "CallExpression"
        ? s.expression
        : null;
    if (!call) continue;
    if (call.callee?.type !== "Identifier" || call.callee.name !== "setResponseStatus") continue;
    const statusArg = call.arguments[1];
    if (statusArg?.type === "Literal" && typeof statusArg.value === "number") return statusArg.value;
  }
  return null;
}

/**
 * Prefer an explicit `return` over leading ExpressionStatements (e.g. setResponseStatus).
 * @param {import('estree').Function} fn
 */
function extractNitroHandlerExpression(fn) {
  const body = fn.body;
  if (body?.type === "BlockStatement") {
    for (const s of body.body) {
      if (s.type === "ReturnStatement") return s.argument ?? null;
    }
    return null;
  }
  return extractHandlerExpression(fn);
}

/**
 * @param {import('estree').Expression} expr
 */
function peelJsonCallArgument(expr) {
  if (expr.type !== "CallExpression") return null;
  const callee = expr.callee;
  if (callee?.type === "Identifier" && callee.name === "json") {
    return expr.arguments[0] ?? null;
  }
  if (callee?.type === "MemberExpression" && !callee.computed && callee.property?.type === "Identifier") {
    if (callee.property.name === "json") {
      return expr.arguments[0] ?? null;
    }
  }
  return null;
}

function peelResJsonArgument(expr) {
  return peelJsonCallArgument(expr);
}

/**
 * @param {import('estree').Expression} expr
 */
function peelResSendArgument(expr) {
  if (expr.type !== "CallExpression") return null;
  const callee = expr.callee;
  if (callee?.type === "MemberExpression" && !callee.computed && callee.property?.type === "Identifier") {
    if (callee.property.name === "send") {
      const a0 = expr.arguments[0];
      const a1 = expr.arguments[1];
      // Restify: `res.send(code, body)` — peel body when first arg is numeric status.
      if (a0?.type === "Literal" && typeof a0.value === "number" && a1) {
        return a1;
      }
      return a0 ?? null;
    }
  }
  return null;
}

/**
 * @param {import('estree').CallExpression} expr
 */
function peelParseIntCall(expr) {
  if (expr.type !== "CallExpression") return null;
  const callee = expr.callee;
  if (callee?.type !== "Identifier" || callee.name !== "parseInt") return null;
  const arg0 = expr.arguments[0];
  if (!arg0) return null;
  const radixArg = expr.arguments[1];
  const radix =
    radixArg?.type === "Literal" && typeof radixArg.value === "number" ? radixArg.value : 10;
  return { arg: arg0, radix };
}

/**
 * @param {import('estree').CallExpression} expr
 */
function peelDbQueryCall(expr) {
  if (expr.type !== "CallExpression") return null;
  const callee = expr.callee;
  if (
    callee?.type !== "MemberExpression" ||
    callee.computed ||
    callee.property?.type !== "Identifier" ||
    callee.property.name !== "query"
  ) {
    return null;
  }
  const recv = callee.object;
  const recvName = recv?.type === "Identifier" ? recv.name : null;
  if (!recvName || !["db", "pool", "connection", "conn"].includes(recvName)) return null;
  const sqlArg = expr.arguments[0];
  if (sqlArg?.type !== "Literal" || typeof sqlArg.value !== "string") return null;
  /** @type {import('estree').Expression[]} */
  const paramExprs = [];
  const paramsArg = expr.arguments[1];
  if (paramsArg?.type === "ArrayExpression") {
    for (const el of paramsArg.elements) {
      if (el && el.type !== "SpreadElement") paramExprs.push(el);
    }
  }
  return { sql: sqlArg.value, paramExprs, recvName };
}

/** @param {string} sql */
function guessTablesFromSql(sql) {
  const out = new Set();
  const re = /\b(?:from|join|into|update)\s+([a-z_][a-z0-9_]*)/gi;
  let match;
  while ((match = re.exec(sql)) !== null) {
    if (match[1]) out.add(match[1].toLowerCase());
  }
  return [...out];
}

/**
 * @param {object} ctx
 * @param {{ sql: string, paramExprs: import('estree').Expression[] }} peel
 * @param {{ line: number, column: number } | undefined} loc
 */
function lowerDbQueryCall(ctx, peel, loc) {
  const { effect, webir, file } = ctx;
  const origin = loc ? originAt(loc, file) : ctx.origin;
  const params = peel.paramExprs.map((p) => lowerExpression(ctx, p));
  const isRead = /^\s*select\b/i.test(peel.sql);
  const tables = guessTablesFromSql(peel.sql);
  return effect.dbQuery({
    kind: isRead ? "read" : "write",
    sql: peel.sql,
    params,
    returns: "rows",
    tables: tables.length ? tables : ["*"],
    type: T.unknown,
    origin,
    provenance: [webir.provenance("hub-ingest", "javascript-ast:db-query")],
  });
}

/**
 * @param {object} ctx
 * @param {import('estree').Statement} stmt
 */
function lowerDbQueryFromStatement(ctx, stmt) {
  if (stmt.type === "ExpressionStatement") {
    let expr = stmt.expression;
    if (expr?.type === "AwaitExpression") expr = expr.argument;
    if (expr?.type === "CallExpression") {
      const peel = peelDbQueryCall(expr);
      if (peel) return lowerDbQueryCall(ctx, peel, expr.loc?.start);
    }
    return null;
  }
  if (stmt.type === "VariableDeclaration") {
    for (const d of stmt.declarations) {
      let init = d.init;
      if (init?.type === "AwaitExpression") init = init.argument;
      if (init?.type === "CallExpression") {
        const peel = peelDbQueryCall(init);
        if (peel) return lowerDbQueryCall(ctx, peel, init.loc?.start);
      }
    }
  }
  return null;
}

/**
 * @param {object} ctx
 * @param {import('estree').BlockStatement} body
 */
function collectBlockDbQueryEffects(ctx, body) {
  /** @type {import('@chrysalis/webir').NodeId[]} */
  const ids = [];
  for (const stmt of body.body) {
    const id = lowerDbQueryFromStatement(ctx, stmt);
    if (id) ids.push(id);
  }
  return ids;
}

/**
 * @param {import('estree').Expression | null | undefined} expr
 */
function isResEndCall(expr) {
  if (expr?.type !== "CallExpression") return false;
  const callee = expr.callee;
  return (
    callee?.type === "MemberExpression" &&
    !callee.computed &&
    callee.property?.type === "Identifier" &&
    callee.property.name === "end"
  );
}

/**
 * @param {import('estree').Function} fn
 */
function resSendPayloadExpression(fn) {
  const expr = extractHandlerExpression(fn);
  if (expr?.type === "CallExpression") {
    const peeled = peelResSendArgument(expr);
    if (peeled) return peeled;
  }
  const body = fn.body;
  if (body.type === "BlockStatement") {
    for (const s of body.body) {
      if (s.type === "ReturnStatement" && s.argument?.type === "CallExpression") {
        const peeled = peelResSendArgument(s.argument);
        if (peeled) return peeled;
      }
      if (s.type === "ExpressionStatement" && s.expression?.type === "CallExpression") {
        const peeled = peelResSendArgument(s.expression);
        if (peeled) return peeled;
      }
    }
  }
  return null;
}

/**
 * @param {import('estree').Function} fn
 */
function extractHandlerExpression(fn) {
  const body = fn.body;
  if (body.type === "BlockStatement") {
    /** @type {import('estree').Expression | null} */
    let firstExpr = null;
    for (const s of body.body) {
      // Prefer explicit `return` over earlier side-effect assigns (Elysia
      // `ctx.set.status = N; return {…}` — G10025; Restify send+next still
      // peeled via resSendPayloadExpression before this falls through).
      if (s.type === "ReturnStatement") return s.argument ?? null;
      if (s.type === "ExpressionStatement" && firstExpr === null) {
        firstExpr = s.expression ?? null;
      }
    }
    return firstExpr;
  }
  if (
    body.type === "CallExpression" ||
    body.type === "ObjectExpression" ||
    body.type === "Literal" ||
    body.type === "MemberExpression" ||
    body.type === "LogicalExpression" ||
    body.type === "NewExpression" ||
    body.type === "ArrowFunctionExpression" ||
    body.type === "FunctionExpression"
  ) {
    return body;
  }
  return null;
}

/**
 * @param {object} ctx
 * @param {import('estree').Expression | null | undefined} expr
 */
function lowerExpression(ctx, expr) {
  const { data, webir, file } = ctx;
  if (!expr) {
    return data.hole({
      reason: "hub-js:missing-expression",
      input: T.unknown,
      output: T.unknown,
      origin: ctx.origin,
      provenance: [webir.provenance("hub-ingest", "javascript-ast")],
    });
  }
  const origin =
    expr.loc?.start !== undefined ? originAt(expr.loc.start, file) : ctx.origin;
  if (expr.type === "Literal") {
    const v = expr.value;
    if (v === null) {
      return data.hole({
        reason: "hub-js:null-literal",
        input: T.unknown,
        output: T.unknown,
        origin,
        provenance: [webir.provenance("hub-ingest", "javascript-ast")],
      });
    }
    const type =
      typeof v === "string" ? T.string : typeof v === "boolean" ? T.bool : typeof v === "number" ? T.int : T.unknown;
    return data.literal({
      value: v,
      type,
      origin,
      provenance: [webir.provenance("hub-ingest", "javascript-ast:literal")],
    });
  }
  if (expr.type === "Identifier") {
    const nestBind = ctx.nestParamBindings?.get(expr.name);
    if (nestBind) {
      return data.requestField({
        source: nestBind.source,
        name: nestBind.name,
        type: T.string,
        origin,
        provenance: [webir.provenance("hub-ingest", `javascript-ast:nest-${nestBind.source}`)],
      });
    }
    const h3Field = h3DestructuredBodyFieldOf(expr, ctx.h3BodyBindings);
    if (h3Field) {
      return data.requestField({
        source: "body",
        name: h3Field.name,
        type: T.string,
        origin,
        provenance: [webir.provenance("hub-ingest", "javascript-ast:h3-read-body-destructure")],
      });
    }
    const destructBind = destructuredRequestFieldOf(expr, ctx.requestDestructBindings);
    if (destructBind) {
      return data.requestField({
        source: destructBind.source,
        name: destructBind.name,
        type: T.string,
        origin,
        provenance: [
          webir.provenance("hub-ingest", `javascript-ast:destructure-${destructBind.source}`),
        ],
      });
    }
  }
  if (expr.type === "ObjectExpression") {
    return lowerObjectExpression(ctx, expr, origin);
  }
  if (expr.type === "MemberExpression") {
    const field = requestFieldOf(expr);
    if (field) {
      return data.requestField({
        source: field.source,
        name: field.name,
        type: T.string,
        origin,
        provenance: [webir.provenance("hub-ingest", `javascript-ast:req-${field.source}`)],
      });
    }
    const adonisQs = adonisQsMemberFieldOf(expr);
    if (adonisQs) {
      return data.requestField({
        source: adonisQs.source,
        name: adonisQs.name,
        type: T.string,
        origin,
        provenance: [webir.provenance("hub-ingest", "javascript-ast:adonis-qs")],
      });
    }
    const h3Query = h3GetQueryMemberFieldOf(expr);
    if (h3Query) {
      return data.requestField({
        source: "query",
        name: h3Query.name,
        type: T.string,
        origin,
        provenance: [webir.provenance("hub-ingest", "javascript-ast:h3-get-query")],
      });
    }
    const h3Body = h3ReadBodyMemberFieldOf(expr);
    if (h3Body) {
      return data.requestField({
        source: "body",
        name: h3Body.name,
        type: T.string,
        origin,
        provenance: [webir.provenance("hub-ingest", "javascript-ast:h3-read-body")],
      });
    }
    const h3BoundBody = h3BoundBodyMemberFieldOf(expr, ctx.h3BodyBindings);
    if (h3BoundBody) {
      return data.requestField({
        source: "body",
        name: h3BoundBody.name,
        type: T.string,
        origin,
        provenance: [webir.provenance("hub-ingest", "javascript-ast:h3-read-body-bind")],
      });
    }
    return data.hole({
      reason: "hub-js:member-expression",
      input: T.unknown,
      output: T.unknown,
      origin,
      provenance: [webir.provenance("hub-ingest", "javascript-ast")],
    });
  }
  if (expr.type === "LogicalExpression" && expr.operator === "??") {
    const left = lowerExpression(ctx, expr.left);
    const right = lowerExpression(ctx, expr.right);
    return data.binOp({
      operator: "??",
      left,
      right,
      type: T.string,
      origin,
      provenance: [webir.provenance("hub-ingest", "javascript-ast:nullish-coalesce")],
    });
  }
  if (expr.type === "CallExpression") {
    const adonisParam = adonisRequestParamFieldOf(expr);
    if (adonisParam) {
      return data.requestField({
        source: adonisParam.source,
        name: adonisParam.name,
        type: T.string,
        origin,
        provenance: [webir.provenance("hub-ingest", "javascript-ast:adonis-param")],
      });
    }
    const honoReq = honoReqFieldOf(expr);
    if (honoReq) {
      return data.requestField({
        source: honoReq.source,
        name: honoReq.name,
        type: T.string,
        origin,
        provenance: [webir.provenance("hub-ingest", `javascript-ast:hono-req-${honoReq.source}`)],
      });
    }
    const reqHdr = reqGetHeaderFieldOf(expr);
    if (reqHdr) {
      return data.requestField({
        source: "header",
        name: reqHdr.name,
        type: T.string,
        origin,
        provenance: [webir.provenance("hub-ingest", "javascript-ast:req-get")],
      });
    }
    const urlQuery = urlSearchParamsGetFieldOf(expr);
    if (urlQuery) {
      return data.requestField({
        source: "query",
        name: urlQuery.name,
        type: T.string,
        origin,
        provenance: [webir.provenance("hub-ingest", "javascript-ast:url-search-params")],
      });
    }
    const h3Path = h3GetRouterParamFieldOf(expr);
    if (h3Path) {
      return data.requestField({
        source: "path",
        name: h3Path.name,
        type: T.string,
        origin,
        provenance: [webir.provenance("hub-ingest", "javascript-ast:h3-get-router-param")],
      });
    }
    const h3Header = h3GetHeaderFieldOf(expr);
    if (h3Header) {
      return data.requestField({
        source: "header",
        name: h3Header.name,
        type: T.string,
        origin,
        provenance: [webir.provenance("hub-ingest", "javascript-ast:h3-get-header")],
      });
    }
    const h3Cookie = h3GetCookieFieldOf(expr);
    if (h3Cookie) {
      return data.requestField({
        source: "cookie",
        name: h3Cookie.name,
        type: T.string,
        origin,
        provenance: [webir.provenance("hub-ingest", "javascript-ast:h3-get-cookie")],
      });
    }
    const jsonArg = peelJsonCallArgument(expr);
    if (jsonArg) {
      return lowerExpression(ctx, jsonArg);
    }
    const stringifyArg = peelJsonStringifyArgument(expr);
    if (stringifyArg) {
      return lowerExpression(ctx, stringifyArg);
    }
    const parseIntCall = peelParseIntCall(expr);
    if (parseIntCall) {
      const innerId = lowerExpression(ctx, parseIntCall.arg);
      const radixId = data.literal({
        value: parseIntCall.radix,
        type: T.int,
        origin,
        provenance: [webir.provenance("hub-ingest", "javascript-ast:parse-int-radix")],
      });
      return data.call({
        callee: "parseInt",
        args: [innerId, radixId],
        type: T.int,
        origin,
        provenance: [webir.provenance("hub-ingest", "javascript-ast:parse-int")],
      });
    }
    const dbPeel = peelDbQueryCall(expr);
    if (dbPeel) {
      return lowerDbQueryCall(ctx, dbPeel, expr.loc?.start);
    }
    return data.hole({
      reason: "hub-js:call-expression",
      input: T.unknown,
      output: T.unknown,
      origin,
      provenance: [webir.provenance("hub-ingest", "javascript-ast")],
    });
  }
  return data.hole({
    reason: `hub-js:${expr.type}`,
    input: T.unknown,
    output: T.unknown,
    origin,
    provenance: [webir.provenance("hub-ingest", "javascript-ast")],
  });
}

/**
 * @param {import('estree').Function} fn
 * @returns {import('estree').Expression | null}
 */
function resJsonPayloadExpression(fn) {
  const expr = extractHandlerExpression(fn);
  if (expr?.type === "CallExpression") {
    const peeled = peelResJsonArgument(expr);
    if (peeled) return peeled;
  }
  const body = fn.body;
  if (body.type === "BlockStatement") {
    for (const s of body.body) {
      if (s.type === "ReturnStatement" && s.argument?.type === "CallExpression") {
        const peeled = peelResJsonArgument(s.argument);
        if (peeled) return peeled;
      }
      if (s.type === "ExpressionStatement" && s.expression?.type === "CallExpression") {
        const peeled = peelResJsonArgument(s.expression);
        if (peeled) return peeled;
      }
    }
  }
  return null;
}

/**
 * Walk a `res.status(N).json(...)` / `res.status(N).send(...)` chain to recover
 * the explicit HTTP status, if any. Also Restify `res.send(N, body)`.
 * @param {import('estree').Expression | null | undefined} expr
 * @returns {number | null}
 */
function extractResStatus(expr) {
  let cur = expr;
  // itty: `json(body, { status: N })` / numeric 2nd arg (G10047). Not Hono `c.json`.
  if (cur?.type === "CallExpression" && cur.callee?.type === "Identifier" && cur.callee.name === "json") {
    const initStatus = peelResponseInitStatus(cur.arguments[1] ?? null);
    if (initStatus !== null) return initStatus;
    const a1 = cur.arguments[1];
    if (a1?.type === "Literal" && typeof a1.value === "number") return a1.value;
  }
  // Workers: `new Response(…, { status: N })` (G10047).
  if (cur?.type === "NewExpression") {
    const peeled = peelNewResponseExpression(cur);
    if (peeled && peeled.status !== null) return peeled.status;
  }
  while (cur && cur.type === "CallExpression") {
    const callee = cur.callee;
    if (callee?.type !== "MemberExpression" || callee.computed || callee.property?.type !== "Identifier") {
      break;
    }
    // Restify: `res.send(code, body)` — numeric first arg is status when a body follows.
    if (callee.property.name === "send") {
      const a0 = cur.arguments[0];
      const a1 = cur.arguments[1];
      if (a0?.type === "Literal" && typeof a0.value === "number" && a1) {
        return a0.value;
      }
    }
    // Hono: `c.json(body, status)` / `c.text(body, status)` — numeric second arg only
    // (ResponseInit object form stays honest hole — G10019).
    if (
      (callee.property.name === "json" || callee.property.name === "text") &&
      callee.object?.type === "Identifier" &&
      callee.object.name === "c"
    ) {
      const a1 = cur.arguments[1];
      if (a1?.type === "Literal" && typeof a1.value === "number") return a1.value;
    }
    // Workers: `Response.json(body, { status: N })` (G10047) — not Hono `c.json`.
    if (
      callee.property.name === "json" &&
      callee.object?.type === "Identifier" &&
      callee.object.name === "Response"
    ) {
      const initStatus = peelResponseInitStatus(cur.arguments[1] ?? null);
      if (initStatus !== null) return initStatus;
      const a1 = cur.arguments[1];
      if (a1?.type === "Literal" && typeof a1.value === "number") return a1.value;
    }
    // Express `status` / `sendStatus`; Fastify also aliases `code`.
    if (
      callee.property.name === "status" ||
      callee.property.name === "sendStatus" ||
      callee.property.name === "code"
    ) {
      const arg = cur.arguments[0];
      if (arg?.type === "Literal" && typeof arg.value === "number") return arg.value;
    }
    cur = callee.object;
  }
  return null;
}

/**
 * Polka / Node http: `res.writeHead(N, …)` → status.
 * @param {import('estree').Function} fn
 * @returns {number | null}
 */
function extractWriteHeadStatus(fn) {
  const body = fn.body;
  if (body?.type !== "BlockStatement") return null;
  for (const s of body.body) {
    const expr =
      s.type === "ExpressionStatement"
        ? s.expression
        : s.type === "ReturnStatement"
          ? s.argument
          : null;
    if (expr?.type !== "CallExpression") continue;
    const callee = expr.callee;
    if (
      callee?.type !== "MemberExpression" ||
      callee.computed ||
      callee.property?.type !== "Identifier" ||
      callee.property.name !== "writeHead"
    ) {
      continue;
    }
    const a0 = expr.arguments[0];
    if (a0?.type === "Literal" && typeof a0.value === "number") return a0.value;
  }
  return null;
}

/**
 * Polka / Node http: `res.statusCode = N`.
 * @param {import('estree').Function} fn
 * @returns {number | null}
 */
function extractStatusCodeAssign(fn) {
  const body = fn.body;
  if (body?.type !== "BlockStatement") return null;
  for (const s of body.body) {
    if (s.type !== "ExpressionStatement" || s.expression?.type !== "AssignmentExpression") continue;
    const asgn = s.expression;
    if (asgn.operator !== "=" || asgn.left?.type !== "MemberExpression") continue;
    const left = asgn.left;
    if (
      left.computed ||
      left.property?.type !== "Identifier" ||
      left.property.name !== "statusCode"
    ) {
      continue;
    }
    if (asgn.right?.type === "Literal" && typeof asgn.right.value === "number") {
      return asgn.right.value;
    }
  }
  return null;
}

/**
 * `JSON.stringify(value)` → inner expression.
 * @param {import('estree').Expression} expr
 * @returns {import('estree').Expression | null}
 */
function peelJsonStringifyArgument(expr) {
  if (expr?.type !== "CallExpression") return null;
  const callee = expr.callee;
  if (
    callee?.type === "MemberExpression" &&
    !callee.computed &&
    callee.object?.type === "Identifier" &&
    callee.object.name === "JSON" &&
    callee.property?.type === "Identifier" &&
    callee.property.name === "stringify"
  ) {
    return expr.arguments[0] ?? null;
  }
  return null;
}

/**
 * Polka / Node http: `res.end(payload)` argument (any statement in handler).
 * @param {import('estree').Function} fn
 * @returns {import('estree').Expression | null}
 */
function resEndPayloadExpression(fn) {
  const expr = extractHandlerExpression(fn);
  if (expr?.type === "CallExpression") {
    const callee = expr.callee;
    if (
      callee?.type === "MemberExpression" &&
      !callee.computed &&
      callee.property?.type === "Identifier" &&
      callee.property.name === "end" &&
      expr.arguments[0]
    ) {
      return expr.arguments[0];
    }
  }
  const body = fn.body;
  if (body?.type === "BlockStatement") {
    for (const s of body.body) {
      const call =
        s.type === "ExpressionStatement" && s.expression?.type === "CallExpression"
          ? s.expression
          : s.type === "ReturnStatement" && s.argument?.type === "CallExpression"
            ? s.argument
            : null;
      if (!call) continue;
      const callee = call.callee;
      if (
        callee?.type === "MemberExpression" &&
        !callee.computed &&
        callee.property?.type === "Identifier" &&
        callee.property.name === "end" &&
        call.arguments[0]
      ) {
        return call.arguments[0];
      }
    }
  }
  return null;
}

/**
 * Build the status effect node for an explicit `res.status(...)`, prepended to
 * the handler block so the projection/emit see a non-200 response status.
 * @param {object} ctx
 * @param {number | null} status
 * @param {{ line: number, column: number }} [loc]
 */
function lowerStatusEffect(ctx, status, loc) {
  if (status === null || status === 200) return null;
  const { effect, webir, file } = ctx;
  const origin = loc ? originAt(loc, file) : ctx.origin;
  return effect.httpError({
    status,
    message: null,
    origin,
    provenance: [webir.provenance("hub-ingest", "javascript-ast:res-status")],
  });
}

/**
 * @param {object} ctx
 * @param {import('estree').Function} fn
 */
function lowerHandlerBody(ctx, fn) {
  const { data, webir, file } = ctx;
  const requestDestructBindings = collectRequestDestructuringBindings(fn);
  const workCtx =
    requestDestructBindings.size > 0 ? { ...ctx, requestDestructBindings } : ctx;
  const primaryExpr = extractHandlerExpression(fn);
  const status =
    extractResStatus(primaryExpr) ??
    extractResponseJsonInitStatus(primaryExpr) ??
    extractWriteHeadStatus(fn) ??
    extractStatusCodeAssign(fn) ??
    extractCtxStatus(fn) ??
    extractElysiaSetStatus(fn) ??
    ctx.nestHttpCode ??
    null;
  const statusId = lowerStatusEffect(workCtx, status, primaryExpr?.loc?.start);
  // Polka / Node http: `res.end(payload)` (+ optional writeHead/statusCode).
  // Bare `res.end()` stays status-only (204 default).
  if (isResEndCall(primaryExpr) && !primaryExpr.arguments?.[0]) {
    return lowerHubStatusOnly(workCtx, status ?? 204, {
      file,
      line: primaryExpr?.loc?.start?.line ?? 1,
    });
  }
  const endRaw = resEndPayloadExpression(fn);
  if (endRaw) {
    const endPayload = peelJsonStringifyArgument(endRaw) ?? endRaw;
    const valId = lowerExpression(workCtx, endPayload);
    const isObj = endPayload.type === "ObjectExpression";
    const usedStringify = endPayload !== endRaw;
    if (isObj || usedStringify) {
      const retId = data.call({
        callee: "__return_json",
        args: [valId],
        type: T.unknown,
        origin: endPayload.loc?.start ? originAt(endPayload.loc.start, file) : ctx.origin,
        provenance: [webir.provenance("hub-ingest", "javascript-ast:res-end-json")],
      });
      return data.block({
        statements: statusId ? [statusId, retId] : [retId],
        type: T.unknown,
        origin: ctx.origin,
        provenance: [webir.provenance("hub-ingest", "javascript-ast:res-end")],
      });
    }
    return data.block({
      statements: statusId ? [statusId, valId] : [valId],
      type: T.unknown,
      origin: endPayload.loc?.start ? originAt(endPayload.loc.start, file) : ctx.origin,
      provenance: [webir.provenance("hub-ingest", "javascript-ast:res-end")],
    });
  }
  if (isResEndCall(primaryExpr)) {
    return lowerHubStatusOnly(workCtx, status ?? 204, {
      file,
      line: primaryExpr?.loc?.start?.line ?? 1,
    });
  }
  const jsonPayload = resJsonPayloadExpression(fn);
  if (jsonPayload) {
    const valId = lowerExpression(workCtx, jsonPayload);
    const body = fn.body;
    const dbEffects =
      body.type === "BlockStatement" ? collectBlockDbQueryEffects(workCtx, body) : [];
    const retId = data.call({
      callee: "__return_json",
      args: [valId],
      type: T.unknown,
      origin: jsonPayload.loc?.start ? originAt(jsonPayload.loc.start, file) : ctx.origin,
      provenance: [webir.provenance("hub-ingest", "javascript-ast:res-json")],
    });
    const statements = [...(statusId ? [statusId] : []), ...dbEffects, retId];
    return data.block({
      statements,
      type: T.unknown,
      origin: ctx.origin,
      provenance: [webir.provenance("hub-ingest", "javascript-ast:handler-json")],
    });
  }
  // Hono: `c.text(value)` (+ optional status via extractResStatus) — text surface, not JSON.
  const honoTextPayload = honoTextPayloadExpression(fn);
  if (honoTextPayload) {
    const valId = lowerExpression(workCtx, honoTextPayload);
    return data.block({
      statements: statusId ? [statusId, valId] : [valId],
      type: T.unknown,
      origin: honoTextPayload.loc?.start
        ? originAt(honoTextPayload.loc.start, file)
        : ctx.origin,
      provenance: [webir.provenance("hub-ingest", "javascript-ast:hono-text")],
    });
  }
  // Workers / itty: `new Response(body, init?)` (G10047).
  const newResponse = peelNewResponseExpression(primaryExpr);
  if (newResponse && newResponse.payload) {
    const valId = lowerExpression(workCtx, newResponse.payload);
    const isObj = newResponse.payload.type === "ObjectExpression";
    if (isObj || newResponse.usedStringify) {
      const retId = data.call({
        callee: "__return_json",
        args: [valId],
        type: T.unknown,
        origin: newResponse.payload.loc?.start
          ? originAt(newResponse.payload.loc.start, file)
          : ctx.origin,
        provenance: [webir.provenance("hub-ingest", "javascript-ast:new-response-json")],
      });
      return data.block({
        statements: statusId ? [statusId, retId] : [retId],
        type: T.unknown,
        origin: ctx.origin,
        provenance: [webir.provenance("hub-ingest", "javascript-ast:new-response")],
      });
    }
    return data.block({
      statements: statusId ? [statusId, valId] : [valId],
      type: T.unknown,
      origin: newResponse.payload.loc?.start
        ? originAt(newResponse.payload.loc.start, file)
        : ctx.origin,
      provenance: [webir.provenance("hub-ingest", "javascript-ast:new-response")],
    });
  }
  const sendPayload = resSendPayloadExpression(fn);
  if (sendPayload) {
    const valId = lowerExpression(workCtx, sendPayload);
    return data.block({
      statements: statusId ? [statusId, valId] : [valId],
      type: T.unknown,
      origin: sendPayload.loc?.start ? originAt(sendPayload.loc.start, file) : ctx.origin,
      provenance: [webir.provenance("hub-ingest", "javascript-ast:res-send")],
    });
  }
  // Koa: `ctx.body = …` (+ optional `ctx.status = N`) — assignment surface, not return/send.
  const ctxBodyPayload = ctxBodyPayloadExpression(fn);
  if (ctxBodyPayload) {
    const valId = lowerExpression(workCtx, ctxBodyPayload);
    const isObj = ctxBodyPayload.type === "ObjectExpression";
    if (isObj) {
      const retId = data.call({
        callee: "__return_json",
        args: [valId],
        type: T.unknown,
        origin: ctxBodyPayload.loc?.start
          ? originAt(ctxBodyPayload.loc.start, file)
          : ctx.origin,
        provenance: [webir.provenance("hub-ingest", "javascript-ast:ctx-body-json")],
      });
      return data.block({
        statements: statusId ? [statusId, retId] : [retId],
        type: T.unknown,
        origin: ctx.origin,
        provenance: [webir.provenance("hub-ingest", "javascript-ast:ctx-body")],
      });
    }
    return data.block({
      statements: statusId ? [statusId, valId] : [valId],
      type: T.unknown,
      origin: ctxBodyPayload.loc?.start ? originAt(ctxBodyPayload.loc.start, file) : ctx.origin,
      provenance: [webir.provenance("hub-ingest", "javascript-ast:ctx-body")],
    });
  }
  // Hapi: `h.response(value)` (+ optional `.code(N)`); status via extractResStatus.
  const hapiPayload = hapiResponsePayloadExpression(fn);
  if (hapiPayload) {
    const valId = lowerExpression(workCtx, hapiPayload);
    return data.block({
      statements: statusId ? [statusId, valId] : [valId],
      type: T.unknown,
      origin: hapiPayload.loc?.start ? originAt(hapiPayload.loc.start, file) : ctx.origin,
      provenance: [webir.provenance("hub-ingest", "javascript-ast:hapi-response")],
    });
  }
  const expr = primaryExpr;
  // Skip bare `ctx.status = N` / other assignments that are not response payloads.
  if (expr && expr.type === "AssignmentExpression") {
    // fall through to handler-body hole unless already handled above
  } else if (expr) {
    const valId = lowerExpression(workCtx, expr);
    return data.block({
      statements: statusId ? [statusId, valId] : [valId],
      type: T.unknown,
      origin: expr.loc?.start ? originAt(expr.loc.start, file) : ctx.origin,
      provenance: [webir.provenance("hub-ingest", "javascript-ast:handler-expr")],
    });
  }
  const body = fn.body;
  if (body.type === "CallExpression" || body.type === "ObjectExpression" || body.type === "Literal") {
    const valId = lowerExpression(workCtx, body);
    return data.block({
      statements: [valId],
      type: T.unknown,
      origin: ctx.origin,
      provenance: [webir.provenance("hub-ingest", "javascript-ast:expr-body")],
    });
  }
  return data.hole({
    reason: "hub-js:handler-body",
    input: T.unknown,
    output: T.unknown,
    origin: ctx.origin,
    provenance: [webir.provenance("hub-ingest", "javascript-ast")],
  });
}

/**
 * @param {object} opts
 * @returns {{ routeCount: number, astRouteCount: number, usedAst: boolean }}
 */
export function liftJavaScriptFileToWebir(opts) {
  const { webir, builder, wr, source, file, language } = opts;
  const data = webir.dataDialect.builders(builder);
  const effect = webir.effectDialect.builders(builder);
  let astRouteCount = 0;

  /** Nest decorator routes (TS compiler API; before acorn strip). */
  /** @type {Array<{ method: string, path: string, fn: import('estree').Function, loc: { line: number, column: number }, httpCode: number | null, paramBindings: Map<string, { source: string, name: string }> }>} */
  const nestRoutes =
    looksLikeNestControllerSource(source) && /\.tsx?$/i.test(file)
      ? extractNestRoutesFromTsSource(source, file)
      : [];

  let ast;
  try {
    ast = parseJavaScriptSource(source, file);
  } catch {
    if (nestRoutes.length === 0) {
      return { routeCount: 0, astRouteCount: 0, usedAst: false };
    }
    ast = null;
  }

  /** @type {Array<{ method: string, path: string, fn: import('estree').Function, loc?: { line: number, column: number }, httpCode?: number | null, paramBindings?: Map<string, { source: string, name: string }> }>} */
  const routes = [...nestRoutes];
  let honoOrigin = false;
  let elysiaOrigin = false;
  let oakOrigin = false;
  let bunServeOrigin = false;
  let ittyOrigin = false;
  let cfWorkersOrigin = false;
  let adonisOrigin = false;
  if (ast) {
    walkSimple(ast, {
      CallExpression(node) {
        const r = extractRouteFromCall(node);
        if (r) routes.push(r);
        for (const hr of extractHapiRoutesFromCall(node)) routes.push(hr);
        if (isBunServeCall(node)) bunServeOrigin = true;
        for (const br of extractBunServeRoutesFromCall(node)) routes.push(br);
        if (isIttyRouterCallExpression(node)) ittyOrigin = true;
        // Adonis `Route.get|post|…` receiver (G10059).
        if (
          node.callee?.type === "MemberExpression" &&
          !node.callee.computed &&
          node.callee.object?.type === "Identifier" &&
          node.callee.object.name === "Route" &&
          node.callee.property?.type === "Identifier" &&
          HTTP_METHODS.has(
            (HTTP_METHOD_ALIASES.get(node.callee.property.name) ?? node.callee.property.name).toLowerCase(),
          )
        ) {
          adonisOrigin = true;
        }
      },
      NewExpression(node) {
        if (isHonoNewExpression(node)) honoOrigin = true;
        if (isElysiaNewExpression(node)) elysiaOrigin = true;
        if (isOakApplicationNewExpression(node)) oakOrigin = true;
      },
      ImportDeclaration(node) {
        if (isAdonisImportSource(node)) adonisOrigin = true;
      },
    });
    // Workers fetch export (G10063): only when no Bun.serve / itty / Hono / Elysia / Oak / Adonis
    // router markers — do not steal Bun.serve `fetch` fallback or itty `export default router`.
    if (
      !bunServeOrigin &&
      !ittyOrigin &&
      !honoOrigin &&
      !elysiaOrigin &&
      !oakOrigin &&
      !adonisOrigin
    ) {
      const cfRoutes = extractCfWorkersFetchRoutes(ast);
      if (cfRoutes.length > 0) {
        cfWorkersOrigin = true;
        for (const cr of cfRoutes) routes.push(cr);
      }
    }
  }

  // Elysia `.use` is plugin-shaped (not `(ctx, next)`); peel empty lifecycle only (G10053).
  // itty has no onion `next` — peel empty/`next`-only `router.all` only (G10064); skip Express `.use`.
  const mw = ast
    ? elysiaOrigin
      ? liftElysiaLifecycleMiddlewareToWebir({ ast, file, builder, wr, webir })
      : ittyOrigin
        ? liftIttyPassthroughMiddlewareToWebir({ ast, file, builder, wr, webir })
        : liftExpressMiddlewareToWebir({ ast, file, builder, wr, webir })
    : { middlewareUseCount: 0, middlewareRootCount: 0 };

  if (routes.length === 0 && mw.middlewareRootCount === 0) {
    return { routeCount: 0, astRouteCount: 0, usedAst: false, middlewareUseCount: 0, middlewareRootCount: 0 };
  }

  for (const r of routes) {
    astRouteCount += 1;
    const origin = originAt(r.loc ?? { line: 1, column: 0 }, file);
    const ctx = {
      data,
      effect,
      webir,
      file,
      origin,
      nestHttpCode: r.httpCode ?? null,
      nestParamBindings: r.paramBindings ?? null,
    };
    const bodyId = lowerHandlerBody(ctx, r.fn);
    const dialectTag = r.paramBindings
      ? `nestjs`
      : adonisOrigin
        ? `adonis`
        : cfWorkersOrigin
          ? `cf-workers`
          : ittyOrigin
            ? `itty`
            : bunServeOrigin
              ? `bun-serve`
              : oakOrigin
                ? `oak`
                : elysiaOrigin
                  ? `elysia`
                  : honoOrigin
                    ? `hono`
                    : null;
    const handlerId = wr.handler({
      attrs: {
        name: `${r.method}_${r.path.replace(/[^a-zA-Z0-9]+/g, "_")}`,
        input: T.unknown,
        output: T.unknown,
      },
      body: bodyId,
      effects: [],
      origin,
      provenance: [
        webir.provenance(
          "hub-ingest",
          dialectTag ? `javascript-ast:${dialectTag}:${language}` : `javascript-ast:${language}`,
        ),
      ],
    });
    const routeId = wr.route({
      attrs: { method: r.method, path: r.path, pathParams: [] },
      handler: handlerId,
      origin,
      provenance: [
        webir.provenance(
          "hub-ingest",
          dialectTag ? `route:${dialectTag}:${language}` : `route:${language}`,
        ),
      ],
    });
    builder.addRoot(routeId);
  }

  return {
    routeCount: routes.length,
    astRouteCount,
    usedAst: true,
    nestRouteCount: nestRoutes.length,
    middlewareUseCount: mw.middlewareUseCount,
    middlewareRootCount: mw.middlewareRootCount,
  };
}

/**
 * Count Express-style `app.use(...)` middleware registrations (pipeline shell only).
 * @param {string} source
 */
/**
 * Lower exported SvelteKit +server HTTP handlers (GET/POST/...).
 * @param {object} opts
 * @returns {{ ok: boolean, handlers: Array<{ method: string, bodyId: string }>, reason?: string }}
 */
export function liftSvelteKitServerHandlerBodies(opts) {
  const { source, file, webir, builder, wr } = opts;
  const data = webir.dataDialect.builders(builder);
  const effect = webir.effectDialect.builders(builder);
  let ast;
  try {
    ast = parseJavaScriptSource(source, file);
  } catch {
    return { ok: false, handlers: [], reason: "parse-failed" };
  }
  const methods = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);
  /** @type {Array<{ method: string, bodyId: string }>} */
  const handlers = [];
  walkSimple(ast, {
    ExportNamedDeclaration(node) {
      if (node.declaration?.type === "FunctionDeclaration" && node.declaration.id?.type === "Identifier") {
        const name = node.declaration.id.name.toUpperCase();
        if (!methods.has(name)) return;
        const origin = originAt(node.declaration.loc?.start ?? { line: 1, column: 0 }, file);
        const ctx = { data, effect, webir, file, origin };
        handlers.push({ method: name, bodyId: lowerHandlerBody(ctx, node.declaration) });
      }
    },
  });
  if (handlers.length === 0) return { ok: false, handlers: [], reason: "missing-export-handler" };
  return { ok: true, handlers };
}

/**
 * Lower a SvelteKit `export function GET(...) { return json(...); }` handler body.
 * @param {object} opts
 * @returns {{ ok: boolean, bodyId?: string, method?: string, reason?: string }}
 */
export function liftSvelteKitServerHandlerBody(opts) {
  const multi = liftSvelteKitServerHandlerBodies(opts);
  if (!multi.ok || multi.handlers.length === 0) return { ok: false, reason: multi.reason ?? "missing-export-handler" };
  const first = multi.handlers[0];
  return { ok: true, bodyId: first.bodyId, method: first.method };
}

/**
 * Lower a SvelteKit `export function load(...) { return { ... }; }` body (RFC-0013 v1).
 * @param {object} opts
 * @returns {{ ok: boolean, loadValueId?: string, reason?: string }}
 */
/**
 * Literal boolean fields from a simple `load() { return { visible: true, ... } }`.
 * @param {string} source
 * @param {string} file
 * @returns {Record<string, boolean>}
 */
export function extractLoadLiteralBools(source, file) {
  let ast;
  try {
    ast = parseJavaScriptSource(source, file);
  } catch {
    return {};
  }
  /** @type {import('estree').FunctionDeclaration | null} */
  let loadFn = null;
  walkSimple(ast, {
    ExportNamedDeclaration(node) {
      if (node.declaration?.type === "FunctionDeclaration" && node.declaration.id?.name === "load") {
        loadFn = node.declaration;
      }
    },
  });
  if (!loadFn) return {};
  const expr = extractHandlerExpression(loadFn);
  if (!expr || expr.type !== "ObjectExpression") return {};
  /** @type {Record<string, boolean>} */
  const out = {};
  for (const prop of expr.properties) {
    if (prop.type !== "Property" || prop.key?.type !== "Identifier") continue;
    if (prop.value?.type === "Literal" && typeof prop.value.value === "boolean") {
      out[prop.key.name] = prop.value.value;
    }
  }
  return out;
}

export function liftSvelteKitPageLoadFunction(opts) {
  const { source, file, webir, builder } = opts;
  const data = webir.dataDialect.builders(builder);
  const effect = webir.effectDialect.builders(builder);
  let ast;
  try {
    ast = parseJavaScriptSource(source, file);
  } catch {
    return { ok: false, reason: "parse-failed" };
  }
  /** @type {import('estree').FunctionDeclaration | null} */
  let loadFn = null;
  walkSimple(ast, {
    ExportNamedDeclaration(node) {
      if (node.declaration?.type === "FunctionDeclaration" && node.declaration.id?.name === "load") {
        loadFn = node.declaration;
      }
    },
  });
  if (!loadFn) return { ok: false, reason: "missing-load-export" };
  const origin = originAt(loadFn.loc?.start ?? { line: 1, column: 0 }, file);
  const ctx = { data, effect, webir, file, origin };
  const expr = extractHandlerExpression(loadFn);
  if (!expr || expr.type !== "ObjectExpression") {
    return { ok: false, reason: "unsupported-load-return" };
  }
  /** @type {string[]} */
  const loadFieldNames = [];
  for (const prop of expr.properties) {
    if (prop.type === "Property" && prop.key?.type === "Identifier") {
      loadFieldNames.push(prop.key.name);
    }
  }
  const loadValueId = lowerExpression(ctx, expr);
  return { ok: true, loadValueId, loadFieldNames };
}

/**
 * Lower Next.js App Router `route.ts` exported HTTP handlers (G1167).
 * @param {object} opts
 */
export function liftNextAppRouteHandlerBodies(opts) {
  return liftSvelteKitServerHandlerBodies(opts);
}

/**
 * Lower a Nitro/h3 `defineEventHandler` / `eventHandler` body (status + return).
 * @param {object} ctx
 * @param {import('estree').Function} fn
 */
function lowerNitroHandlerBody(ctx, fn) {
  const { data, webir, file } = ctx;
  const nitroCtx = {
    ...ctx,
    h3BodyBindings: collectH3ReadBodyBindings(fn),
  };
  const status = extractSetResponseStatus(fn) ?? extractResStatus(extractNitroHandlerExpression(fn));
  const statusId = lowerStatusEffect(nitroCtx, status, fn.loc?.start);
  const expr = extractNitroHandlerExpression(fn);
  if (!expr) {
    return data.hole({
      reason: "hub-js:handler-body",
      input: T.unknown,
      output: T.unknown,
      origin: ctx.origin,
      provenance: [webir.provenance("hub-ingest", "javascript-ast:nitro")],
    });
  }
  const jsonPayload = expr.type === "CallExpression" ? peelResJsonArgument(expr) : null;
  if (jsonPayload || expr.type === "ObjectExpression") {
    const payload = jsonPayload ?? expr;
    const valId = lowerExpression(nitroCtx, payload);
    const retId = data.call({
      callee: "__return_json",
      args: [valId],
      type: T.unknown,
      origin: payload.loc?.start ? originAt(payload.loc.start, file) : ctx.origin,
      provenance: [webir.provenance("hub-ingest", "javascript-ast:nitro-json")],
    });
    return data.block({
      statements: statusId ? [statusId, retId] : [retId],
      type: T.unknown,
      origin: ctx.origin,
      provenance: [webir.provenance("hub-ingest", "javascript-ast:nitro-handler")],
    });
  }
  const valId = lowerExpression(nitroCtx, expr);
  return data.block({
    statements: statusId ? [statusId, valId] : [valId],
    type: T.unknown,
    origin: expr.loc?.start ? originAt(expr.loc.start, file) : ctx.origin,
    provenance: [webir.provenance("hub-ingest", "javascript-ast:nitro-handler")],
  });
}

/**
 * Extract handler fn from `export default defineEventHandler(fn)` / `eventHandler(fn)`.
 * @param {import('estree').Node} node
 * @returns {import('estree').Function | null}
 */
function nitroHandlerFromExportDefault(node) {
  if (node.type !== "ExportDefaultDeclaration") return null;
  const decl = node.declaration;
  if (decl?.type === "CallExpression") {
    const callee = decl.callee;
    const name =
      callee?.type === "Identifier"
        ? callee.name
        : callee?.type === "MemberExpression" && !callee.computed && callee.property?.type === "Identifier"
          ? callee.property.name
          : null;
    if (name !== "defineEventHandler" && name !== "eventHandler") return null;
    return handlerCallback(decl.arguments[0]);
  }
  if (decl?.type === "ArrowFunctionExpression" || decl?.type === "FunctionExpression" || decl?.type === "FunctionDeclaration") {
    return decl;
  }
  return null;
}

/**
 * Lower Nitro/h3 `export default defineEventHandler(...)` (single handler per file).
 * Method comes from the caller (filename `.get.ts` / `.post.ts` / …).
 * @param {object} opts
 * @returns {{ ok: boolean, bodyId?: string, reason?: string }}
 */
export function liftNitroEventHandlerBody(opts) {
  const { source, file, webir, builder } = opts;
  const data = webir.dataDialect.builders(builder);
  const effect = webir.effectDialect.builders(builder);
  let ast;
  try {
    ast = parseJavaScriptSource(source, file);
  } catch {
    return { ok: false, reason: "parse-failed" };
  }
  /** @type {import('estree').Function | null} */
  let fn = null;
  /** @type {{ line: number, column: number } | null} */
  let loc = null;
  walkSimple(ast, {
    ExportDefaultDeclaration(node) {
      if (fn) return;
      const found = nitroHandlerFromExportDefault(node);
      if (found) {
        fn = found;
        loc = found.loc?.start ?? node.loc?.start ?? { line: 1, column: 0 };
      }
    },
  });
  if (!fn) return { ok: false, reason: "missing-define-event-handler" };
  const origin = originAt(loc ?? { line: 1, column: 0 }, file);
  const ctx = { data, effect, webir, file, origin };
  return { ok: true, bodyId: lowerNitroHandlerBody(ctx, fn) };
}

export function countExpressMiddlewareUses(source) {
  let count = 0;
  try {
    const ast = parseJavaScriptSource(source, "scan.js");
    walkSimple(ast, {
      CallExpression(node) {
        if (node.callee?.type !== "MemberExpression" || node.callee.computed) return;
        if (node.callee.property?.type !== "Identifier") return;
        const method = node.callee.property.name;
        if (method !== "use" && method !== "pre") return;
        const recv = node.callee.object;
        if (recv?.type !== "Identifier" || !RECEIVER_NAMES.has(recv.name)) return;
        if (method === "pre" && recv.name !== "server") return;
        count += 1;
      },
    });
  } catch {
    return 0;
  }
  return count;
}

/**
 * Fallback when AST finds no routes: heuristic paths only.
 */
export { detectHttpRoutesInSource };
