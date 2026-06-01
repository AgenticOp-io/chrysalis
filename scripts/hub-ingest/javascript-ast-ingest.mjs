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
 * Detect an Express request-field access: `<req>.params.<name>`,
 * `<req>.query.<name>`, or their computed string forms. Returns the WebIR
 * request field source ("path" | "query") and field name, or null.
 * @param {import('estree').MemberExpression} expr
 * @returns {{ source: "path" | "query", name: string } | null}
 */
function requestFieldOf(expr) {
  if (expr.type !== "MemberExpression") return null;
  const name =
    !expr.computed && expr.property?.type === "Identifier"
      ? expr.property.name
      : expr.computed && expr.property?.type === "Literal" && typeof expr.property.value === "string"
        ? expr.property.value
        : null;
  if (!name) return null;
  const owner = expr.object;
  if (owner?.type === "Identifier" && owner.name === "params") {
    return { source: "path", name };
  }
  if (owner?.type !== "MemberExpression" || owner.computed) return null;
  if (owner.property?.type !== "Identifier") return null;
  const bucket = owner.property.name;
  if (owner.object?.type !== "Identifier") return null;
  if (bucket === "params") return { source: "path", name };
  if (bucket === "query") return { source: "query", name };
  return null;
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
    const jsonArg = peelJsonCallArgument(expr);
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
 * the explicit HTTP status, if any.
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
    if (callee.property.name === "status" || callee.property.name === "sendStatus") {
      const arg = cur.arguments[0];
      if (arg?.type === "Literal" && typeof arg.value === "number") return arg.value;
    }
    cur = callee.object;
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
  const status = extractResStatus(primaryExpr);
  const statusId = lowerStatusEffect(ctx, status, primaryExpr?.loc?.start);
  const jsonPayload = resJsonPayloadExpression(fn);
  if (jsonPayload) {
    const valId = lowerExpression(ctx, jsonPayload);
    const retId = data.call({
      callee: "__return_json",
      args: [valId],
      type: T.unknown,
      origin: jsonPayload.loc?.start ? originAt(jsonPayload.loc.start, file) : ctx.origin,
      provenance: [webir.provenance("hub-ingest", "javascript-ast:res-json")],
    });
    return data.block({
      statements: statusId ? [statusId, retId] : [retId],
      type: T.unknown,
      origin: ctx.origin,
      provenance: [webir.provenance("hub-ingest", "javascript-ast:handler-json")],
    });
  }
  const expr = primaryExpr;
  if (expr) {
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
    const ctx = { data, effect, webir, file, origin };
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
/**
 * Lower a SvelteKit `export function GET(...) { return json(...); }` handler body.
 * @param {object} opts
 * @returns {{ ok: boolean, bodyId?: string, method?: string, reason?: string }}
 */
export function liftSvelteKitServerHandlerBody(opts) {
  const { source, file, webir, builder, wr, method = "GET" } = opts;
  const data = webir.dataDialect.builders(builder);
  const effect = webir.effectDialect.builders(builder);
  let ast;
  try {
    ast = parseJavaScriptSource(source, file);
  } catch {
    return { ok: false, reason: "parse-failed" };
  }
  const want = method.toUpperCase();
  /** @type {import('estree').Function | null} */
  let fn = null;
  /** @type {string | null} */
  let foundMethod = null;
  walkSimple(ast, {
    ExportNamedDeclaration(node) {
      if (fn) return;
      if (node.declaration?.type === "FunctionDeclaration" && node.declaration.id?.type === "Identifier") {
        const name = node.declaration.id.name.toUpperCase();
        if (name === want) {
          fn = node.declaration;
          foundMethod = name;
        }
      }
    },
    ExportDefaultDeclaration(node) {
      if (fn) return;
      const d = node.declaration;
      if (d?.type === "FunctionDeclaration" && d.id?.type === "Identifier") {
        const name = d.id.name.toUpperCase();
        if (name === want) {
          fn = d;
          foundMethod = name;
        }
      }
    },
  });
  if (!fn) return { ok: false, reason: "missing-export-handler" };
  const origin = originAt(fn.loc?.start ?? { line: 1, column: 0 }, file);
  const ctx = { data, effect, webir, file, origin };
  const bodyId = lowerHandlerBody(ctx, fn);
  return { ok: true, bodyId, method: foundMethod ?? want };
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
