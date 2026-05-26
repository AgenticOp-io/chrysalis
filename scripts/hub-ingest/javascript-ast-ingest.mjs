/**
 * JavaScript / TypeScript hub ingest v0 (acorn + optional TS strip via typescript).
 * Lowers Express-style routes and simple literal/json-ish returns; everything else is a hole.
 */
import * as acorn from "acorn";
import { simple as walkSimple } from "acorn-walk";
import ts from "typescript";
import { detectHttpRoutesInSource } from "./lift-routes-heuristic.mjs";
import { liftExpressMiddlewareToWebir } from "./hub-express-middleware.mjs";

const HTTP_METHODS = new Set(["get", "post", "put", "patch", "delete", "head", "options"]);
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
  const method = node.callee.property.name;
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
 * @param {import('estree').Expression} expr
 */
function peelResJsonArgument(expr) {
  if (expr.type !== "CallExpression") return null;
  const callee = expr.callee;
  if (callee?.type === "MemberExpression" && !callee.computed && callee.property?.type === "Identifier") {
    if (callee.property.name === "json") {
      return expr.arguments[0] ?? null;
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
  if (expr.type === "ObjectExpression") {
    return lowerObjectExpression(ctx, expr, origin);
  }
  if (expr.type === "CallExpression") {
    const jsonArg = peelResJsonArgument(expr);
    if (jsonArg) {
      return lowerExpression(ctx, jsonArg);
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
 * @param {object} ctx
 * @param {import('estree').Function} fn
 */
function lowerHandlerBody(ctx, fn) {
  const { data, webir, file } = ctx;
  const expr = extractHandlerExpression(fn);
  if (expr) {
    const valId = lowerExpression(ctx, expr);
    return data.block({
      statements: [valId],
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
  let astRouteCount = 0;

  let ast;
  try {
    ast = parseJavaScriptSource(source, file);
  } catch {
    return { routeCount: 0, astRouteCount: 0, usedAst: false };
  }

  const routes = [];
  walkSimple(ast, {
    CallExpression(node) {
      const r = extractRouteFromCall(node);
      if (r) routes.push(r);
    },
  });

  const mw = liftExpressMiddlewareToWebir({ ast, file, builder, wr, webir });

  if (routes.length === 0 && mw.middlewareRootCount === 0) {
    return { routeCount: 0, astRouteCount: 0, usedAst: false, middlewareUseCount: 0, middlewareRootCount: 0 };
  }

  for (const r of routes) {
    astRouteCount += 1;
    const origin = originAt(r.loc ?? { line: 1, column: 0 }, file);
    const ctx = { data, webir, file, origin };
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
      provenance: [webir.provenance("hub-ingest", `javascript-ast:${language}`)],
    });
    const routeId = wr.route({
      attrs: { method: r.method, path: r.path, pathParams: [] },
      handler: handlerId,
      origin,
      provenance: [webir.provenance("hub-ingest", `route:${language}`)],
    });
    builder.addRoot(routeId);
  }

  return {
    routeCount: routes.length,
    astRouteCount,
    usedAst: true,
    middlewareUseCount: mw.middlewareUseCount,
    middlewareRootCount: mw.middlewareRootCount,
  };
}

/**
 * Count Express-style `app.use(...)` middleware registrations (pipeline shell only).
 * @param {string} source
 */
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
