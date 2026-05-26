/** Shared WebIR route emission for hub AST/heuristic lifts. */

export const HUB_T = {
  string: { kind: "string" },
  int: { kind: "int" },
  bool: { kind: "bool" },
  unknown: { kind: "unknown" },
};

export function hubOrigin(file, line = 1) {
  return { file, line, column: 1 };
}

/**
 * @param {object} ctx — { data, webir }
 * @param {unknown} value
 * @param {{ file: string, line?: number }} loc
 */
export function lowerHubLiteral(ctx, value, loc) {
  const { data, webir } = ctx;
  const origin = hubOrigin(loc.file, loc.line ?? 1);
  const type =
    typeof value === "string"
      ? HUB_T.string
      : typeof value === "boolean"
        ? HUB_T.bool
        : typeof value === "number"
          ? HUB_T.int
          : HUB_T.unknown;
  return data.block({
    statements: [
      data.literal({
        value,
        type,
        origin,
        provenance: [webir.provenance("hub-ingest", "literal-return")],
      }),
    ],
    type: HUB_T.unknown,
    origin,
    provenance: [webir.provenance("hub-ingest", "literal-return")],
  });
}

/**
 * @param {object} ctx
 * @param {string} reason
 * @param {{ file: string, line?: number }} loc
 */
export function hubHandlerBodyHole(ctx, reason, loc) {
  const { data, webir } = ctx;
  const origin = hubOrigin(loc.file, loc.line ?? 1);
  return data.hole({
    reason,
    input: HUB_T.unknown,
    output: HUB_T.unknown,
    origin,
    provenance: [webir.provenance("hub-ingest", reason)],
  });
}

/**
 * @param {object} opts
 */
export function emitHubRoute(opts) {
  const { webir, builder, wr, language, file, route, bodyId } = opts;
  const origin = hubOrigin(file, route.line ?? 1);
  const handlerId = wr.handler({
    attrs: {
      name: route.name || `${route.method}_${String(route.path).replace(/[^a-zA-Z0-9]+/g, "_")}`,
      input: HUB_T.unknown,
      output: HUB_T.unknown,
    },
    body: bodyId,
    effects: [],
    origin,
    provenance: [webir.provenance("hub-ingest", `hub-lift:${language}`)],
  });
  const routeId = wr.route({
    attrs: { method: route.method, path: route.path, pathParams: [] },
    handler: handlerId,
    origin,
    provenance: [webir.provenance("hub-ingest", `route:${language}`)],
  });
  builder.addRoot(routeId);
}
