/**
 * CWL → WebIR ingest (direct; no lossy lift).
 */
import { emitHubRoute, hubHandlerBodyHole, HUB_T, lowerHubLiteral } from "./hub-lift-webir-route.mjs";
import { parseCwlModule } from "./cwl-parser.mjs";
import { liftCwlModuleMiddlewareToWebir } from "./hub-cwl-middleware.mjs";

/**
 * @param {string} language
 * @param {string} ext
 */
export function canCwlIngest(language, ext) {
  return language === "cwl" && ext.toLowerCase() === ".cwl";
}

/**
 * Lower structured object to __object_literal call pattern.
 */
function lowerObjectBody(ctx, obj, loc) {
  const { data, webir, file } = ctx;
  const origin = { file, line: loc.line ?? 1, column: 1 };
  const flat = [];
  for (const [key, val] of Object.entries(obj)) {
    const t =
      typeof val === "string"
        ? HUB_T.string
        : typeof val === "boolean"
          ? HUB_T.bool
          : typeof val === "number"
            ? HUB_T.int
            : HUB_T.unknown;
    flat.push(
      data.literal({
        value: key,
        type: HUB_T.string,
        origin,
        provenance: [webir.provenance("hub-ingest", "cwl:object-key")],
      }),
    );
    flat.push(
      data.literal({
        value: val,
        type: t,
        origin,
        provenance: [webir.provenance("hub-ingest", "cwl:object-val")],
      }),
    );
  }
  return data.block({
    statements: [
      data.call({
        callee: "__object_literal",
        args: flat,
        type: HUB_T.unknown,
        origin,
        provenance: [webir.provenance("hub-ingest", "cwl:object")],
      }),
    ],
    type: HUB_T.unknown,
    origin,
    provenance: [webir.provenance("hub-ingest", "cwl:return")],
  });
}

/**
 * @param {object} opts
 */
export function liftCwlFileToWebir(opts) {
  const { webir, builder, wr, source, file, language } = opts;
  const data = webir.dataDialect.builders(builder);
  const ctx = { data, webir, file };
  const parsed = parseCwlModule(source, file);
  const wrBuilders = wr ?? webir.webRequest.builders(builder);
  let middlewareUseCount = 0;
  let middlewareRootCount = 0;
  if (parsed.moduleUses?.length) {
    const mw = liftCwlModuleMiddlewareToWebir(parsed.moduleUses, { file, builder, wr: wrBuilders, webir });
    middlewareUseCount = mw.middlewareUseCount;
    middlewareRootCount = mw.middlewareRootCount;
  }
  if (parsed.routes.length === 0 && middlewareUseCount === 0) {
    return { routeCount: 0, astRouteCount: 0, usedAst: false, middlewareUseCount, middlewareRootCount };
  }

  for (const r of parsed.routes) {
    let bodyId;
    const loc = { file, line: r.line };
    if (r.body.kind === "literal") {
      bodyId = lowerHubLiteral(ctx, r.body.value, loc);
    } else if (r.body.kind === "object" && r.body.value) {
      bodyId = lowerObjectBody(ctx, r.body.value, loc);
    } else {
      bodyId = hubHandlerBodyHole(ctx, r.body.reason ?? "cwl:hole", loc);
    }
    emitHubRoute({
      webir,
      builder,
      wr: wrBuilders,
      language,
      file,
      route: { method: r.method, path: r.path, name: r.name, line: r.line },
      bodyId,
    });
  }

  return {
    routeCount: parsed.routes.length,
    astRouteCount: parsed.routes.length,
    usedAst: true,
    middlewareUseCount,
    middlewareRootCount,
  };
}
