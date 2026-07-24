/**
 * JavaScript / TypeScript hub ingest v0 (acorn + optional TS strip via typescript).
 * Lowers Express-style routes and simple literal/json-ish returns; everything else is a hole.
 */
import * as acorn from "acorn";
import { simple as walkSimple } from "acorn-walk";
import ts from "typescript";
import { detectHttpRoutesInSource } from "./lift-routes-heuristic.mjs";
import { liftExpressMiddlewareToWebir } from "./hub-express-middleware.mjs";
import { lowerHubStatusOnly } from "./hub-lift-webir-route.mjs";
import {
  extractNestRoutesFromTsSource,
  looksLikeNestControllerSource,
} from "./nestjs-ast-ingest.mjs";

const HTTP_METHODS = new Set(["get", "post", "put", "patch", "delete", "head", "options"]);
/** Restify aliases `del` for DELETE (origin shape — not invented). */
const HTTP_METHOD_ALIASES = new Map([["del", "delete"]]);
const RECEIVER_NAMES = new Set(["app", "router", "server", "fastify"]);

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
    path: pathArg.value,
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
 * Peel one Hapi `server.route({ method, path, handler })` config object.
 * @param {import('estree').ObjectExpression} obj
 * @param {import('estree').CallExpression} callNode
 * @returns {{ method: string, path: string, fn: import('estree').Function, loc: { line: number, column: number } } | null}
 */
function peelHapiRouteObject(obj, callNode) {
  /** @type {string | null} */
  let method = null;
  /** @type {string | null} */
  let path = null;
  /** @type {import('estree').Function | null} */
  let fn = null;
  for (const p of obj.properties ?? []) {
    if (p.type !== "Property") continue;
    const key = objectPropKeyName(p);
    if (!key) continue;
    if (key === "method") {
      if (p.value?.type === "Literal" && typeof p.value.value === "string") {
        method = String(p.value.value).toUpperCase();
      }
      // method: ['GET','POST'] etc. → leave unwired (honest hole / skip)
    } else if (key === "path") {
      if (p.value?.type === "Literal" && typeof p.value.value === "string") {
        path = p.value.value;
      }
    } else if (key === "handler") {
      fn = handlerCallback(p.value);
    }
  }
  if (!method || !path || !fn) return null;
  if (!HTTP_METHODS.has(method.toLowerCase())) return null;
  return {
    method,
    path,
    fn,
    loc: callNode.loc?.start ?? obj.loc?.start ?? { line: 1, column: 0 },
  };
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
    const r = peelHapiRouteObject(arg, node);
    return r ? [r] : [];
  }
  if (arg.type === "ArrayExpression") {
    /** @type {Array<{ method: string, path: string, fn: import('estree').Function, loc: { line: number, column: number } }>} */
    const out = [];
    for (const el of arg.elements ?? []) {
      if (el?.type !== "ObjectExpression") continue;
      const r = peelHapiRouteObject(el, node);
      if (r) out.push(r);
    }
    return out;
  }
  return [];
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
 * Koa `ctx.body = value` assignment → response payload expression.
 * @param {import('estree').Expression | null | undefined} expr
 */
function peelCtxBodyAssignment(expr) {
  if (expr?.type !== "AssignmentExpression" || expr.operator !== "=") return null;
  const left = expr.left;
  if (left?.type !== "MemberExpression" || left.computed) return null;
  if (left.object?.type !== "Identifier" || left.object.name !== "ctx") return null;
  if (left.property?.type !== "Identifier" || left.property.name !== "body") return null;
  return expr.right ?? null;
}

/**
 * Koa `ctx.status = N` → HTTP status code.
 * @param {import('estree').Expression | null | undefined} expr
 * @returns {number | null}
 */
function peelCtxStatusAssignment(expr) {
  if (expr?.type !== "AssignmentExpression" || expr.operator !== "=") return null;
  const left = expr.left;
  if (left?.type !== "MemberExpression" || left.computed) return null;
  if (left.object?.type !== "Identifier" || left.object.name !== "ctx") return null;
  if (left.property?.type !== "Identifier" || left.property.name !== "status") return null;
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
 * SvelteKit / Next load: `url.searchParams.get("q")`.
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
  if (searchParams.object?.type !== "Identifier" || searchParams.object.name !== "url") return null;
  const arg = expr.arguments[0];
  if (arg?.type !== "Literal" || typeof arg.value !== "string") return null;
  return { name: arg.value };
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
    for (const s of body.body) {
      if (s.type === "ReturnStatement") return s.argument ?? null;
      if (s.type === "ExpressionStatement") return s.expression ?? null;
    }
    return null;
  }
  if (
    body.type === "CallExpression" ||
    body.type === "ObjectExpression" ||
    body.type === "Literal" ||
    body.type === "MemberExpression" ||
    body.type === "LogicalExpression" ||
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
  const primaryExpr = extractHandlerExpression(fn);
  const status =
    extractResStatus(primaryExpr) ??
    extractWriteHeadStatus(fn) ??
    extractStatusCodeAssign(fn) ??
    extractCtxStatus(fn) ??
    ctx.nestHttpCode ??
    null;
  const statusId = lowerStatusEffect(ctx, status, primaryExpr?.loc?.start);
  // Polka / Node http: `res.end(payload)` (+ optional writeHead/statusCode).
  // Bare `res.end()` stays status-only (204 default).
  if (isResEndCall(primaryExpr) && !primaryExpr.arguments?.[0]) {
    return lowerHubStatusOnly(ctx, status ?? 204, {
      file,
      line: primaryExpr?.loc?.start?.line ?? 1,
    });
  }
  const endRaw = resEndPayloadExpression(fn);
  if (endRaw) {
    const endPayload = peelJsonStringifyArgument(endRaw) ?? endRaw;
    const valId = lowerExpression(ctx, endPayload);
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
    return lowerHubStatusOnly(ctx, status ?? 204, {
      file,
      line: primaryExpr?.loc?.start?.line ?? 1,
    });
  }
  const jsonPayload = resJsonPayloadExpression(fn);
  if (jsonPayload) {
    const valId = lowerExpression(ctx, jsonPayload);
    const body = fn.body;
    const dbEffects =
      body.type === "BlockStatement" ? collectBlockDbQueryEffects(ctx, body) : [];
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
  const sendPayload = resSendPayloadExpression(fn);
  if (sendPayload) {
    const valId = lowerExpression(ctx, sendPayload);
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
    const valId = lowerExpression(ctx, ctxBodyPayload);
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
    const valId = lowerExpression(ctx, hapiPayload);
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
    const valId = lowerExpression(ctx, expr);
    return data.block({
      statements: statusId ? [statusId, valId] : [valId],
      type: T.unknown,
      origin: expr.loc?.start ? originAt(expr.loc.start, file) : ctx.origin,
      provenance: [webir.provenance("hub-ingest", "javascript-ast:handler-expr")],
    });
  }
  const body = fn.body;
  if (body.type === "CallExpression" || body.type === "ObjectExpression" || body.type === "Literal") {
    const valId = lowerExpression(ctx, body);
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
  if (ast) {
    walkSimple(ast, {
      CallExpression(node) {
        const r = extractRouteFromCall(node);
        if (r) routes.push(r);
        for (const hr of extractHapiRoutesFromCall(node)) routes.push(hr);
      },
    });
  }

  const mw = ast
    ? liftExpressMiddlewareToWebir({ ast, file, builder, wr, webir })
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
          r.paramBindings ? `javascript-ast:nestjs:${language}` : `javascript-ast:${language}`,
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
          r.paramBindings ? `route:nestjs:${language}` : `route:${language}`,
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
        if (node.callee.property?.type !== "Identifier" || node.callee.property.name !== "use") return;
        const recv = node.callee.object;
        if (recv?.type === "Identifier" && RECEIVER_NAMES.has(recv.name)) count += 1;
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
