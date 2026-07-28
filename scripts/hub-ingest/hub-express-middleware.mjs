/**
 * Lower Express-style `app.use(...)` / Restify `server.pre|use(...)` /
 * Hono/Koa/Polka `app.use(...)` registrations to WebIR `web.request.middleware` nodes.
 *
 * Honest peels only (D6442 / D6447):
 * - Known presets: `express.json` / `express.urlencoded`
 * - Empty / next-only pass-through function middleware (Nitro-parallel; no onion runtime)
 * - Everything else keeps a middleware root with an honest hole body
 */
import { simple as walkSimple } from "acorn-walk";
import { parseJavaScriptSource } from "./javascript-ast-ingest.mjs";

const RECEIVER_NAMES = new Set(["app", "router", "server", "fastify"]);
/** Restify `pre` + shared `use` (Express/Koa/Polka/Fastify/Hono). */
const MW_METHODS = new Set(["use", "pre"]);

/**
 * @param {import('estree').Node | null | undefined} expr
 */
function isNextCall(expr) {
  return (
    expr?.type === "CallExpression" &&
    expr.callee?.type === "Identifier" &&
    expr.callee.name === "next" &&
    (expr.arguments?.length ?? 0) === 0
  );
}

/**
 * @param {import('estree').Node | null | undefined} expr
 */
function isAwaitNext(expr) {
  return expr?.type === "AwaitExpression" && isNextCall(expr.argument);
}

/**
 * Empty body or only `next()` / `return next()` / `await next()` / `return await next()`.
 * Does not invent Koa/Hono onion / Restify plugin runtime — only catalogs a no-op shell.
 * @param {import('estree').Node | null | undefined} node
 */
export function isPassThroughMiddlewareFn(node) {
  if (!node) return false;
  if (node.type !== "ArrowFunctionExpression" && node.type !== "FunctionExpression") return false;
  const body = node.body;
  if (!body) return true;
  if (body.type !== "BlockStatement") {
    return isNextCall(body) || isAwaitNext(body);
  }
  if (body.body.length === 0) return true;
  if (body.body.length !== 1) return false;
  const stmt = body.body[0];
  if (stmt.type === "ExpressionStatement") {
    return isNextCall(stmt.expression) || isAwaitNext(stmt.expression);
  }
  if (stmt.type === "ReturnStatement" && stmt.argument) {
    return isNextCall(stmt.argument) || isAwaitNext(stmt.argument);
  }
  return false;
}

/**
 * @param {import('estree').Node | null | undefined} node
 * @param {"use" | "pre"} method
 */
function middlewareKindFromArg(node, method) {
  if (!node) return method === "pre" ? "legacy:restify-pre" : "legacy:express-use";
  if (isPassThroughMiddlewareFn(node)) {
    return method === "pre" ? "restify.passthrough" : "js.passthrough";
  }
  if (node.type === "CallExpression" && node.callee?.type === "MemberExpression" && !node.callee.computed) {
    const prop = node.callee.property;
    const obj = node.callee.object;
    if (prop?.type === "Identifier" && obj?.type === "Identifier" && obj.name === "express") {
      if (prop.name === "json") return "express.json";
      if (prop.name === "urlencoded") return "express.urlencoded";
      if (prop.name === "static") return "express.static";
    }
  }
  return method === "pre" ? "legacy:restify-pre" : "legacy:express-use";
}

/**
 * @param {import('estree').CallExpression} node
 */
function extractUseFromCall(node) {
  if (node.callee?.type !== "MemberExpression" || node.callee.computed) return null;
  if (node.callee.property?.type !== "Identifier") return null;
  const method = node.callee.property.name;
  if (!MW_METHODS.has(method)) return null;
  const recv = node.callee.object;
  if (recv?.type !== "Identifier" || !RECEIVER_NAMES.has(recv.name)) return null;
  // Restify `pre` is only meaningful on `server` (origin shape).
  if (method === "pre" && recv.name !== "server") return null;
  const first = node.arguments[0];
  let mount = "*";
  let argForKind = first;
  if (method === "use" && first?.type === "Literal" && typeof first.value === "string") {
    mount = first.value;
    argForKind = node.arguments[1];
  }
  return {
    mount,
    method,
    kind: middlewareKindFromArg(argForKind, /** @type {"use" | "pre"} */ (method)),
    loc: node.loc?.start ?? { line: 1, column: 0 },
  };
}

const PRESET_KINDS = new Set([
  "express.json",
  "express.urlencoded",
  "js.passthrough",
  "restify.passthrough",
]);

/**
 * @param {object} opts
 * @param {ReturnType<import('./javascript-ast-ingest.mjs')['parseJavaScriptSource']>} opts.ast
 * @param {string} opts.file
 * @param {import('@chrysalis/webir').ModuleBuilder} opts.builder
 * @param {ReturnType<import('@chrysalis/webir').webRequest.builders>} opts.wr
 * @param {typeof import('@chrysalis/webir')} opts.webir
 */
export function liftExpressMiddlewareToWebir(opts) {
  const { ast, file, builder, wr, webir } = opts;
  const data = webir.dataDialect.builders(builder);
  const uses = [];
  walkSimple(ast, {
    CallExpression(node) {
      const u = extractUseFromCall(node);
      if (u) uses.push(u);
    },
  });
  uses.sort((a, b) => (a.loc.line ?? 0) - (b.loc.line ?? 0) || (a.loc.column ?? 0) - (b.loc.column ?? 0));

  let order = 0;
  for (const u of uses) {
    order += 1;
    const origin = { file, line: u.loc.line ?? 1, column: (u.loc.column ?? 0) + 1 };
    let bodyId;
    if (PRESET_KINDS.has(u.kind)) {
      bodyId = data.literal({
        value: { preset: u.kind },
        type: { kind: "unknown" },
        origin,
        provenance: [webir.provenance("hub-ingest", `middleware-preset:${u.kind}`)],
      });
    } else {
      bodyId = data.hole({
        reason: `legacy:hub-middleware:${u.kind}`,
        input: { kind: "unknown" },
        output: { kind: "unknown" },
        origin,
        provenance: [webir.provenance("hub-ingest", "middleware-shell")],
      });
    }
    const middlewareId = wr.middleware({
      attrs: { kind: u.kind, mount: u.mount, order, method: u.method },
      body: bodyId,
      origin,
      provenance: [webir.provenance("hub-ingest", `middleware:${u.kind}`)],
    });
    builder.addRoot(middlewareId);
  }
  return { middlewareUseCount: uses.length, middlewareRootCount: uses.length };
}

/**
 * @param {string} source
 * @param {string} file
 */
export function liftExpressMiddlewareFromSource(source, file, webir, builder, wr) {
  try {
    const ast = parseJavaScriptSource(source, file);
    return liftExpressMiddlewareToWebir({ ast, file, builder, wr, webir });
  } catch {
    return { middlewareUseCount: 0, middlewareRootCount: 0 };
  }
}
