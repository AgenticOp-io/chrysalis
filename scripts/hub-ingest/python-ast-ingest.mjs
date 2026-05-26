/**
 * Python hub ingest v0 — uses CPython ast when python3 is on PATH (Flask/FastAPI-style decorators).
 */
import { spawnSync } from "node:child_process";
import { resolveHubPython } from "./shared.mjs";

const T = {
  string: { kind: "string" },
  int: { kind: "int" },
  bool: { kind: "bool" },
  unknown: { kind: "unknown" },
};

const PARSE_ROUTES_PY = `
import ast
import json
import sys

source = sys.stdin.read()
try:
    tree = ast.parse(source)
except SyntaxError as e:
    print(json.dumps({"error": str(e), "routes": []}))
    sys.exit(0)

RECEIVERS = {"app", "router", "api", "bp", "blueprint"}
HTTP_NAMES = {"get", "post", "put", "patch", "delete", "head", "options", "route"}

def const_str(node):
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    if isinstance(node, ast.Str):
        return node.s
    return None

def const_val(node):
    if isinstance(node, ast.Constant):
        return node.value
    if isinstance(node, ast.Str):
        return node.s
    if isinstance(node, ast.Num):
        return node.n
    if isinstance(node, ast.NameConstant):
        return node.value
    return None

def const_dict(node):
    if not isinstance(node, ast.Dict):
        return None
    out = {}
    for k, v in zip(node.keys, node.values):
        if k is None:
            return None
        key = const_str(k) if not isinstance(k, ast.Constant) else (k.value if isinstance(k.value, str) else None)
        if key is None and isinstance(k, ast.Constant) and isinstance(k.value, str):
            key = k.value
        if key is None:
            return None
        val = const_val(v)
        if val is None:
            return None
        out[key] = val
    return out

def methods_from_keywords(kw):
    for k in kw:
        if k.arg == "methods" and isinstance(k.value, (ast.List, ast.Tuple)):
            out = []
            for elt in k.value.elts:
                s = const_str(elt)
                if s:
                    out.append(s.upper())
            return out
    return None

def route_from_decorator(dec):
    if not isinstance(dec, ast.Call):
        return None
    func = dec.func
    if not isinstance(func, ast.Attribute):
        return None
    if func.attr not in HTTP_NAMES:
        return None
    recv = func.value
    if isinstance(recv, ast.Name) and recv.id not in RECEIVERS:
        return None
    if not dec.args:
        return None
    path = const_str(dec.args[0])
    if not path:
        return None
    if func.attr == "route":
        methods = methods_from_keywords(dec.keywords) or ["GET"]
    else:
        methods = [func.attr.upper()]
    line = dec.lineno if hasattr(dec, "lineno") else 1
    return [{"method": m, "path": path, "line": line} for m in methods]

routes = []
for node in tree.body:
    if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
        continue
    for dec in node.decorator_list:
        found = route_from_decorator(dec)
        if found:
            for r in found:
                routes.append({
                    "method": r["method"],
                    "path": r["path"],
                    "line": r["line"],
                    "name": node.name,
                    "returns": type(node.body[-1]).__name__ if node.body else None,
                    "returnKind": None,
                })
            if node.body:
                last = node.body[-1]
                if isinstance(last, ast.Return) and last.value is not None:
                    v = const_val(last.value)
                    d = const_dict(last.value) if isinstance(last.value, ast.Dict) else None
                    if d is not None:
                        routes[-1]["returnKind"] = "literal"
                        routes[-1]["returnValue"] = d
                    elif v is not None and not isinstance(v, dict):
                        routes[-1]["returnKind"] = "literal"
                        routes[-1]["returnValue"] = v
                    elif isinstance(last.value, ast.Dict):
                        routes[-1]["returnKind"] = "dict"
                    else:
                        routes[-1]["returnKind"] = type(last.value).__name__
            break

print(json.dumps({"routes": routes}))
`;

/**
 * @param {string} language
 * @param {string} ext
 */
export function canPythonAstIngest(language, ext) {
  return language === "python" && ext.toLowerCase() === ".py";
}

/**
 * @param {string} source
 * @returns {{ routes: Array<{ method: string, path: string, line: number, name: string, returnKind?: string }> }}
 */
export function parsePythonRoutes(source) {
  const py = resolveHubPython();
  const r = spawnSync(py, ["-c", PARSE_ROUTES_PY], {
    input: source,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  if (r.status !== 0 || !r.stdout?.trim()) {
    return { routes: [] };
  }
  try {
    const j = JSON.parse(r.stdout.trim());
    return { routes: Array.isArray(j.routes) ? j.routes : [] };
  } catch {
    return { routes: [] };
  }
}

function originAt(line, file) {
  return { file, line: line ?? 1, column: 1 };
}

/**
 * @param {object} opts
 * @returns {{ routeCount: number, astRouteCount: number, usedAst: boolean }}
 */
export function liftPythonFileToWebir(opts) {
  const { webir, builder, wr, source, file, language } = opts;
  const data = webir.dataDialect.builders(builder);
  const { routes } = parsePythonRoutes(source);
  if (routes.length === 0) {
    return { routeCount: 0, astRouteCount: 0, usedAst: false };
  }

  for (const r of routes) {
    const origin = originAt(r.line, file);
    let bodyId;
    if (r.returnKind === "literal" && r.returnValue !== undefined && r.returnValue !== null) {
      const v = r.returnValue;
      let valId;
      if (v !== null && typeof v === "object" && !Array.isArray(v)) {
        const flat = [];
        for (const [key, val] of Object.entries(v)) {
          const t =
            typeof val === "string"
              ? T.string
              : typeof val === "boolean"
                ? T.bool
                : typeof val === "number"
                  ? T.int
                  : T.unknown;
          flat.push(
            data.literal({
              value: key,
              type: T.string,
              origin,
              provenance: [webir.provenance("hub-ingest", "python-ast:object-key")],
            }),
          );
          flat.push(
            data.literal({
              value: val,
              type: t,
              origin,
              provenance: [webir.provenance("hub-ingest", "python-ast:object-val")],
            }),
          );
        }
        valId = data.call({
          callee: "__object_literal",
          args: flat,
          type: T.unknown,
          origin,
          provenance: [webir.provenance("hub-ingest", "python-ast:dict")],
        });
      } else {
        const type =
          typeof v === "string"
            ? T.string
            : typeof v === "boolean"
              ? T.bool
              : typeof v === "number"
                ? T.int
                : T.unknown;
        valId = data.literal({
          value: v,
          type,
          origin,
          provenance: [webir.provenance("hub-ingest", "python-ast:literal")],
        });
      }
      bodyId = data.block({
        statements: [valId],
        type: T.unknown,
        origin,
        provenance: [webir.provenance("hub-ingest", "python-ast:return")],
      });
    } else {
      bodyId = data.hole({
        reason:
          r.returnKind === "dict"
            ? "hub-python:dict-return"
            : r.returnKind
              ? `hub-python:${r.returnKind}`
              : "hub-python:handler-body",
        input: T.unknown,
        output: T.unknown,
        origin,
        provenance: [webir.provenance("hub-ingest", "python-ast")],
      });
    }

    const handlerId = wr.handler({
      attrs: {
        name: r.name || `${r.method}_${r.path.replace(/[^a-zA-Z0-9]+/g, "_")}`,
        input: T.unknown,
        output: T.unknown,
      },
      body: bodyId,
      effects: [],
      origin,
      provenance: [webir.provenance("hub-ingest", `python-ast:${language}`)],
    });
    const routeId = wr.route({
      attrs: { method: r.method, path: r.path, pathParams: [] },
      handler: handlerId,
      origin,
      provenance: [webir.provenance("hub-ingest", `route:${language}`)],
    });
    builder.addRoot(routeId);
  }

  return { routeCount: routes.length, astRouteCount: routes.length, usedAst: true };
}
