/**
 * NestJS decorator route foundation (origin dialect of TypeScript).
 * Uses the TypeScript compiler API so @Controller / @Get/@Post/... survive
 * (acorn-after-transpile strips decorators into __decorate).
 *
 * Translate-only (D6442 / D6447): route surface + handler body lowering via
 * shared JS/TS AST. No Nest DI / modules / guards / pipes / interceptors runtime.
 */
import * as acorn from "acorn";
import ts from "typescript";

const NEST_HTTP = new Set(["Get", "Post", "Put", "Patch", "Delete", "Head", "Options"]);
const PARAM_DECORATORS = {
  Param: "path",
  Query: "query",
  Body: "body",
  Headers: "header",
  Header: "header",
  Cookie: "cookie",
  Cookies: "cookie",
};

/**
 * @param {string} prefix
 * @param {string} methodPath
 */
export function joinNestControllerPath(prefix, methodPath) {
  const p = String(prefix ?? "")
    .trim()
    .replace(/\/+$/, "");
  const m = String(methodPath ?? "")
    .trim()
    .replace(/^\/+/, "");
  if (!p && !m) return "/";
  if (!p) return m.startsWith("/") ? m : `/${m}`;
  const base = p.startsWith("/") ? p : `/${p}`;
  if (!m) return base || "/";
  return `${base}/${m}`.replace(/\/{2,}/g, "/");
}

/**
 * @param {ts.Decorator} dec
 * @returns {string | null}
 */
function decoratorCalleeName(dec) {
  const expr = dec.expression;
  if (ts.isCallExpression(expr)) {
    if (ts.isIdentifier(expr.expression)) return expr.expression.text;
    if (
      ts.isPropertyAccessExpression(expr.expression) &&
      ts.isIdentifier(expr.expression.name)
    ) {
      return expr.expression.name.text;
    }
    return null;
  }
  if (ts.isIdentifier(expr)) return expr.text;
  return null;
}

/**
 * @param {ts.Decorator} dec
 * @param {number} [index]
 * @returns {string | null}
 */
function decoratorStringArg(dec, index = 0) {
  if (!ts.isCallExpression(dec.expression)) return null;
  const arg = dec.expression.arguments[index];
  if (!arg) return null;
  if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) return arg.text;
  return null;
}

/**
 * @param {ts.Decorator} dec
 * @returns {number | null}
 */
function decoratorNumericArg(dec, index = 0) {
  if (!ts.isCallExpression(dec.expression)) return null;
  const arg = dec.expression.arguments[index];
  if (!arg) return null;
  if (ts.isNumericLiteral(arg)) return Number(arg.text);
  if (ts.isPrefixUnaryExpression(arg) && arg.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(arg.operand)) {
    return -Number(arg.operand.text);
  }
  return null;
}

/**
 * @param {ts.HasDecorators} node
 * @returns {readonly ts.Decorator[]}
 */
function decoratorsOf(node) {
  if (typeof ts.getDecorators === "function" && ts.canHaveDecorators?.(node)) {
    return ts.getDecorators(node) ?? [];
  }
  // Fallback for older typescript shapes.
  const legacy = /** @type {{ decorators?: readonly ts.Decorator[] }} */ (node).decorators;
  return legacy ?? [];
}

/**
 * @param {ts.ClassDeclaration} cls
 * @returns {string}
 */
function controllerPrefix(cls) {
  for (const dec of decoratorsOf(cls)) {
    if (decoratorCalleeName(dec) !== "Controller") continue;
    const path = decoratorStringArg(dec, 0);
    return path ?? "";
  }
  return "";
}

/**
 * @param {ts.ClassDeclaration} cls
 */
function classHasController(cls) {
  return decoratorsOf(cls).some((dec) => decoratorCalleeName(dec) === "Controller");
}

/**
 * @param {ts.MethodDeclaration} method
 * @returns {{ method: string, path: string } | null}
 */
function httpRouteFromMethod(method) {
  for (const dec of decoratorsOf(method)) {
    const name = decoratorCalleeName(dec);
    if (!name || !NEST_HTTP.has(name)) continue;
    const pathArg = decoratorStringArg(dec, 0);
    return { method: name.toUpperCase(), path: pathArg ?? "" };
  }
  return null;
}

/**
 * @param {ts.MethodDeclaration} method
 * @returns {number | null}
 */
function httpCodeFromMethod(method) {
  for (const dec of decoratorsOf(method)) {
    if (decoratorCalleeName(dec) !== "HttpCode") continue;
    return decoratorNumericArg(dec, 0);
  }
  return null;
}

/**
 * @param {ts.ParameterDeclaration} param
 * @returns {{ source: "path" | "query" | "body" | "header" | "cookie", name: string } | null}
 */
function nestParamBinding(param) {
  const local =
    param.name && ts.isIdentifier(param.name) ? param.name.text : null;
  if (!local) return null;
  for (const dec of decoratorsOf(param)) {
    const name = decoratorCalleeName(dec);
    if (!name || !(name in PARAM_DECORATORS)) continue;
    const source = /** @type {"path"|"query"|"body"|"header"|"cookie"} */ (PARAM_DECORATORS[name]);
    const field = decoratorStringArg(dec, 0) ?? local;
    return { source, name: field };
  }
  return null;
}

/**
 * Lower a Nest method to an ESTree function for shared `lowerHandlerBody`.
 * Param types/decorators are stripped; bindings are carried separately.
 * @param {ts.SourceFile} sf
 * @param {ts.MethodDeclaration} method
 * @param {string} file
 * @returns {import('estree').Function | null}
 */
function nestMethodToEstreeFn(sf, method, file) {
  if (!method.body) return null;
  /** @type {string[]} */
  const paramNames = [];
  for (const p of method.parameters) {
    if (p.name && ts.isIdentifier(p.name)) paramNames.push(p.name.text);
    else paramNames.push("_");
  }
  const bodyText = method.body.getText(sf);
  const synthetic = `function __nest(${paramNames.join(", ")}) ${bodyText}\n`;
  const out = ts.transpileModule(synthetic, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: file.replace(/\.tsx?$/i, "") + ".__nest.js",
  });
  try {
    const ast = acorn.parse(out.outputText, {
      ecmaVersion: "latest",
      sourceType: "module",
      allowHashBang: true,
      locations: true,
    });
    for (const stmt of ast.body) {
      if (stmt.type === "FunctionDeclaration") return /** @type {import('estree').Function} */ (stmt);
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * @param {string} source
 * @param {string} file
 * @returns {Array<{
 *   method: string,
 *   path: string,
 *   fn: import('estree').Function,
 *   loc: { line: number, column: number },
 *   httpCode: number | null,
 *   paramBindings: Map<string, { source: "path"|"query"|"body"|"header"|"cookie", name: string }>,
 * }>}
 */
export function extractNestRoutesFromTsSource(source, file) {
  if (!/\.tsx?$/i.test(file)) return [];
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  /** @type {ReturnType<typeof extractNestRoutesFromTsSource>} */
  const routes = [];

  /**
   * @param {ts.Node} node
   */
  function visit(node) {
    if (ts.isClassDeclaration(node) && classHasController(node)) {
      const prefix = controllerPrefix(node);
      for (const member of node.members) {
        if (!ts.isMethodDeclaration(member)) continue;
        const http = httpRouteFromMethod(member);
        if (!http) continue;
        const fn = nestMethodToEstreeFn(sf, member, file);
        if (!fn) continue;
        /** @type {Map<string, { source: "path"|"query"|"body"|"header"|"cookie", name: string }>} */
        const paramBindings = new Map();
        for (const p of member.parameters) {
          const bind = nestParamBinding(p);
          if (!bind) continue;
          if (p.name && ts.isIdentifier(p.name)) paramBindings.set(p.name.text, bind);
        }
        const start = sf.getLineAndCharacterOfPosition(member.getStart(sf));
        routes.push({
          method: http.method,
          path: joinNestControllerPath(prefix, http.path),
          fn,
          loc: { line: start.line + 1, column: start.character },
          httpCode: httpCodeFromMethod(member),
          paramBindings,
        });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sf);
  return routes;
}

/**
 * True when source looks like a Nest controller file (cheap prefilter).
 * @param {string} source
 */
export function looksLikeNestControllerSource(source) {
  return /@Controller\b/.test(source) && /@(Get|Post|Put|Patch|Delete|Head|Options)\b/.test(source);
}
