/**
 * Hub Python → WebIR lowering (@chrysalis/ingest origin adapter).
 */
import { parseSourceSync, type PythonHubRoute, type PythonReturnNode, type PythonSqlEffect } from "@chrysalis/python-bridge";
import {
  ModuleBuilder,
  dataDialect,
  effectDialect,
  phpLocator,
  provenance,
  webRequest,
  type Module,
  type NodeId,
  type WebIRType,
} from "@chrysalis/webir";
import type { HttpMethod } from "@chrysalis/webir/dialects/web-request";

function asLiteralValue(v: unknown): string | number | boolean | null {
  if (v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
    return v;
  }
  return String(v);
}

function asHttpMethod(method: string): HttpMethod {
  const u = method.toUpperCase();
  if (
    u === "GET" ||
    u === "POST" ||
    u === "PUT" ||
    u === "PATCH" ||
    u === "DELETE" ||
    u === "HEAD" ||
    u === "OPTIONS"
  ) {
    return u;
  }
  return "GET";
}

const T = {
  string: { kind: "string" } as WebIRType,
  int: { kind: "int" } as WebIRType,
  bool: { kind: "bool" } as WebIRType,
  unknown: { kind: "unknown" } as WebIRType,
};

function originAt(line: number | undefined, file: string) {
  return phpLocator(file, line ?? 1, 1);
}

function guessTablesFromSql(sql: string): string[] {
  const out = new Set<string>();
  const re = /\b(?:from|join|into|update)\s+([a-z_][a-z0-9_]*)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql)) !== null) {
    if (m[1]) out.add(m[1].toLowerCase());
  }
  return out.size > 0 ? [...out] : ["*"];
}

export function canPythonHubIngest(language: string, ext: string): boolean {
  return language === "python" && ext.toLowerCase() === ".py";
}

/** @deprecated Use {@link canPythonHubIngest}. */
export const canPythonAstIngest = canPythonHubIngest;

export interface LiftPythonHubOpts {
  readonly builder: ModuleBuilder;
  readonly wr: ReturnType<typeof webRequest.builders>;
  readonly source: string;
  readonly file: string;
  readonly language: string;
}

export interface LiftPythonHubResult {
  readonly routeCount: number;
  readonly astRouteCount: number;
  readonly usedAst: boolean;
}

type DataBuilders = ReturnType<typeof dataDialect.builders>;
type EffectBuilders = ReturnType<typeof effectDialect.builders>;

function lowerReturnTree(
  data: DataBuilders,
  tree: PythonReturnNode,
  origin: ReturnType<typeof originAt>,
): NodeId | null {
  if (tree.t === "lit") {
    const v = tree.v;
    const type =
      typeof v === "string"
        ? T.string
        : typeof v === "boolean"
          ? T.bool
          : typeof v === "number"
            ? T.int
            : T.unknown;
    return data.literal({
      value: asLiteralValue(v),
      type,
      origin,
      provenance: [provenance("hub-ingest", origin, "python-ast:literal")],
    });
  }
  if (tree.t === "ref") {
    if (
      tree.source !== "path" &&
      tree.source !== "query" &&
      tree.source !== "body" &&
      tree.source !== "header" &&
      tree.source !== "cookie"
    ) {
      return null;
    }
    const fieldId = data.requestField({
      source: tree.source,
      name: tree.name,
      type: T.string,
      origin,
      provenance: [provenance("hub-ingest", origin, `python-ast:req-${tree.source}`)],
    });
    if (tree.default !== undefined) {
      const defId = data.literal({
        value: asLiteralValue(tree.default),
        type: T.string,
        origin,
        provenance: [provenance("hub-ingest", origin, "python-ast:ref-default")],
      });
      return data.binOp({
        operator: "??",
        left: fieldId,
        right: defId,
        type: T.string,
        origin,
        provenance: [provenance("hub-ingest", origin, "python-ast:nullish-coalesce")],
      });
    }
    return fieldId;
  }
  if (tree.t === "obj") {
    const flat: NodeId[] = [];
    for (const e of tree.entries) {
      const val = lowerReturnTree(data, e.value, origin);
      if (val === null) return null;
      flat.push(
        data.literal({
          value: e.key,
          type: T.string,
          origin,
          provenance: [provenance("hub-ingest", origin, "python-ast:object-key")],
        }),
      );
      flat.push(val);
    }
    return data.call({
      callee: "__object_literal",
      args: flat,
      type: T.unknown,
      origin,
      provenance: [provenance("hub-ingest", origin, "python-ast:dict")],
    });
  }
  return null;
}

function lowerSqlEffect(
  effect: EffectBuilders,
  sqlEffect: PythonSqlEffect,
  data: DataBuilders,
  origin: ReturnType<typeof originAt>,
): NodeId {
  const params = (sqlEffect.params ?? [])
    .map((p) => lowerReturnTree(data, p, origin))
    .filter((p): p is NodeId => p !== null);
  const isRead = /^\s*select\b/i.test(sqlEffect.sql);
  const tables = guessTablesFromSql(sqlEffect.sql);
  return effect.dbQuery({
    kind: isRead ? "read" : "write",
    sql: sqlEffect.sql,
    params,
    returns: "rows",
    tables: tables.length ? tables : ["*"],
    type: T.unknown,
    origin,
    provenance: [provenance("hub-ingest", origin, "python-ast:db-execute")],
  });
}

function flaskPathToCwl(path: string): string {
  // Flask `<id>` / `<int:id>` → CWL/Express-style `:id` (translate-only normalize).
  return path.replace(/<(?:[^:>]+:)?([^>]+)>/g, ":$1");
}

function lowerRouteBody(
  data: DataBuilders,
  effect: EffectBuilders,
  r: PythonHubRoute,
  origin: ReturnType<typeof originAt>,
): NodeId {
  /** @type {NodeId[]} */
  const statements: NodeId[] = [];
  const status =
    typeof r.statusCode === "number" && Number.isFinite(r.statusCode) && r.statusCode !== 200
      ? r.statusCode
      : null;
  if (status !== null) {
    statements.push(
      effect.httpError({
        status,
        message: null,
        origin,
        provenance: [provenance("hub-ingest", origin, "python-ast:status")],
      }),
    );
  }
  for (const sqlEffect of r.sqlEffects ?? []) {
    statements.push(lowerSqlEffect(effect, sqlEffect, data, origin));
  }

  if (r.returnTree) {
    const valId = lowerReturnTree(data, r.returnTree, origin);
    if (valId === null) {
      return data.hole({
        reason: "hub-python:return-tree",
        input: T.unknown,
        output: T.unknown,
        origin,
        provenance: [provenance("hub-ingest", origin, "python-ast")],
      });
    }
    // Bare literals project as text/plain (match JS flagship); refs/objects stay JSON.
    if (r.returnTree.t === "lit") {
      statements.push(valId);
      return data.block({
        statements,
        type: T.unknown,
        origin,
        provenance: [provenance("hub-ingest", origin, "python-ast:handler-lit")],
      });
    }
    const retId = data.call({
      callee: "__return_json",
      args: [valId],
      type: T.unknown,
      origin,
      provenance: [provenance("hub-ingest", origin, "python-ast:return-json")],
    });
    statements.push(retId);
    return data.block({
      statements,
      type: T.unknown,
      origin,
      provenance: [provenance("hub-ingest", origin, "python-ast:handler-tree")],
    });
  }

  const isJsonReturn = r.returnKind === "json" || r.returnKind === "jsonify";
  if (
    (r.returnKind === "literal" || isJsonReturn) &&
    r.returnValue !== undefined &&
    r.returnValue !== null
  ) {
    const v = r.returnValue;
    let valId: NodeId;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      const flat: NodeId[] = [];
      for (const [key, val] of Object.entries(v as Record<string, unknown>)) {
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
            provenance: [provenance("hub-ingest", origin, "python-ast:object-key")],
          }),
        );
        flat.push(
          data.literal({
            value: asLiteralValue(val),
            type: t,
            origin,
            provenance: [provenance("hub-ingest", origin, "python-ast:object-val")],
          }),
        );
      }
      valId = data.call({
        callee: "__object_literal",
        args: flat,
        type: T.unknown,
        origin,
        provenance: [provenance("hub-ingest", origin, "python-ast:dict")],
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
        value: asLiteralValue(v),
        type,
        origin,
        provenance: [provenance("hub-ingest", origin, "python-ast:literal")],
      });
    }
    if (isJsonReturn) {
      const retId = data.call({
        callee: "__return_json",
        args: [valId],
        type: T.unknown,
        origin,
        provenance: [provenance("hub-ingest", origin, "python-ast:jsonify")],
      });
      statements.push(retId);
      return data.block({
        statements,
        type: T.unknown,
        origin,
        provenance: [provenance("hub-ingest", origin, "python-ast:return-json")],
      });
    }
    statements.push(valId);
    return data.block({
      statements,
      type: T.unknown,
      origin,
      provenance: [provenance("hub-ingest", origin, "python-ast:return")],
    });
  }
  if (statements.length > 0) {
    return data.block({
      statements,
      type: T.unknown,
      origin,
      provenance: [provenance("hub-ingest", origin, "python-ast:sql-only")],
    });
  }
  if (r.returnKind === "jsonify") {
    return data.hole({
      reason: "hub-python:jsonify-complex",
      input: T.unknown,
      output: T.unknown,
      origin,
      provenance: [provenance("hub-ingest", origin, "python-ast")],
    });
  }
  return data.hole({
    reason:
      r.returnKind === "dict"
        ? "hub-python:dict-return"
        : r.returnKind
          ? `hub-python:${r.returnKind}`
          : "hub-python:handler-body",
    input: T.unknown,
    output: T.unknown,
    origin,
    provenance: [provenance("hub-ingest", origin, "python-ast")],
  });
}

export function liftPythonRoutesToWebir(
  opts: LiftPythonHubOpts,
  routes: ReadonlyArray<PythonHubRoute>,
): LiftPythonHubResult {
  const { builder, wr, file, language } = opts;
  const data = dataDialect.builders(opts.builder);
  const effect = effectDialect.builders(opts.builder);
  if (routes.length === 0) {
    return { routeCount: 0, astRouteCount: 0, usedAst: false };
  }
  for (const r of routes) {
    const origin = originAt(r.line, file);
    const bodyId = lowerRouteBody(data, effect, r, origin);
    const handlerId = wr.handler({
      attrs: {
        name: r.name || `${r.method}_${r.path.replace(/[^a-zA-Z0-9]+/g, "_")}`,
        input: T.unknown,
        output: T.unknown,
      },
      body: bodyId,
      effects: [],
      origin,
      provenance: [provenance("hub-ingest", origin, `python-ast:${language}`)],
    });
    const routeId = wr.route({
      attrs: { method: asHttpMethod(r.method), path: flaskPathToCwl(r.path), pathParams: [] },
      handler: handlerId,
      origin,
      provenance: [provenance("hub-ingest", origin, `route:${language}`)],
    });
    builder.addRoot(routeId);
  }
  return { routeCount: routes.length, astRouteCount: routes.length, usedAst: true };
}

export function liftPythonFileToWebir(opts: LiftPythonHubOpts): LiftPythonHubResult {
  const parsed = parseSourceSync(opts.source, opts.file);
  return liftPythonRoutesToWebir(opts, parsed.routes);
}

export async function ingestPythonHubSource(
  source: string,
  file: string,
  language = "python",
): Promise<{ module: Module; lift: LiftPythonHubResult }> {
  const builder = new ModuleBuilder({ sourceApp: "hub-python" });
  const wr = webRequest.builders(builder);
  const parsed = parseSourceSync(source, file);
  const lift = liftPythonRoutesToWebir(
    { builder, wr, source, file, language },
    parsed.routes,
  );
  return { module: builder.finish(), lift };
}
