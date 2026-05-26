/**
 * Lower Express-style `app.use(...)` registrations to WebIR `web.request.middleware` nodes.
 */
import { simple as walkSimple } from "acorn-walk";
import { parseJavaScriptSource } from "./javascript-ast-ingest.mjs";

const RECEIVER_NAMES = new Set(["app", "router", "server", "fastify"]);

/**
 * @param {import('estree').Node | null | undefined} node
 */
function middlewareKindFromArg(node) {
  if (!node) return "legacy:express-use";
  if (node.type === "CallExpression" && node.callee?.type === "MemberExpression" && !node.callee.computed) {
    const prop = node.callee.property;
    const obj = node.callee.object;
    if (prop?.type === "Identifier" && obj?.type === "Identifier" && obj.name === "express") {
      if (prop.name === "json") return "express.json";
      if (prop.name === "urlencoded") return "express.urlencoded";
      if (prop.name === "static") return "express.static";
    }
  }
  return "legacy:express-use";
}

/**
 * @param {import('estree').CallExpression} node
 */
function extractUseFromCall(node) {
  if (node.callee?.type !== "MemberExpression" || node.callee.computed) return null;
  if (node.callee.property?.type !== "Identifier" || node.callee.property.name !== "use") return null;
  const recv = node.callee.object;
  if (recv?.type !== "Identifier" || !RECEIVER_NAMES.has(recv.name)) return null;
  const first = node.arguments[0];
  let mount = "*";
  let argForKind = first;
  if (first?.type === "Literal" && typeof first.value === "string") {
    mount = first.value;
    argForKind = node.arguments[1];
  }
  return {
    mount,
    kind: middlewareKindFromArg(argForKind),
    loc: node.loc?.start ?? { line: 1, column: 0 },
  };
}

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
    if (u.kind === "express.json" || u.kind === "express.urlencoded") {
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
      attrs: { kind: u.kind, mount: u.mount, order },
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
