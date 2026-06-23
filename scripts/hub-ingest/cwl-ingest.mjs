/**
 * CWL → WebIR ingest (direct; no lossy lift).
 */
import { emitHubRoute, hubHandlerBodyHole, hubOrigin, HUB_T, lowerHubLiteral, lowerHubPageWithLoadBody } from "./hub-lift-webir-route.mjs";
import { lowerCwlHtmlTemplateBody } from "./cwl-html-template.mjs";
import { lowerCwlUiTreeBody, resolveCwlUiComponent } from "./cwl-ui-tree.mjs";
import { parseCwlModuleResolved, resolveCwlModuleFromPath } from "./cwl-module-graph.mjs";
import { liftCwlModuleMiddlewareToWebir } from "./hub-cwl-middleware.mjs";
import { liftCwlAuthPresetsToWebir } from "./hub-cwl-auth-presets.mjs";
import { cwlEffectsToWebir, wrapCwlExecutableEffects } from "./hub-cwl-effects.mjs";
import { cwlPathParamsForWebir } from "./hub-cwl-path-params.mjs";

/**
 * @param {string} language
 * @param {string} ext
 */
export function canCwlIngest(language, ext) {
  return language === "cwl" && ext.toLowerCase() === ".cwl";
}

/**
 * Lower a path/query param reference to a WebIR request field, wrapping it in a
 * `?? default` binop when the CWL declaration carried a default (`query q = "";`).
 * @param {object} ctx
 * @param {"path" | "query"} source
 * @param {{ name?: string, default?: unknown }} value
 * @param {{ file: string, line: number, column: number }} origin
 */
function lowerCwlParamField(ctx, source, value, origin) {
  const { data, webir } = ctx;
  const field = data.requestField({
    source,
    name: value.name,
    type: HUB_T.string,
    origin,
    provenance: [webir.provenance("hub-ingest", `cwl:${source}-param`)],
  });
  if (!Object.prototype.hasOwnProperty.call(value, "default")) return field;
  const fallback = lowerHubLiteral(ctx, value.default, { file: origin.file, line: origin.line });
  return data.binOp({
    operator: "??",
    left: field,
    right: fallback,
    type: HUB_T.string,
    origin,
    provenance: [webir.provenance("hub-ingest", `cwl:${source}-param-default`)],
  });
}

/**
 * @param {object} ctx
 * @param {Array<{ key: string, value: { kind: string, value?: unknown, name?: string } }>} entries
 * @param {{ file: string, line?: number }} loc
 */
function lowerObjectEntriesBody(ctx, entries, loc) {
  const { data, webir, file } = ctx;
  const origin = { file, line: loc.line ?? 1, column: 1 };
  const flat = [];
  for (const { key, value } of entries) {
    flat.push(
      data.literal({
        value: key,
        type: HUB_T.string,
        origin,
        provenance: [webir.provenance("hub-ingest", "cwl:object-key")],
      }),
    );
    if (value.kind === "pathParam" && value.name) {
      flat.push(lowerCwlParamField(ctx, "path", value, origin));
      continue;
    }
    if (value.kind === "queryParam" && value.name) {
      flat.push(lowerCwlParamField(ctx, "query", value, origin));
      continue;
    }
    if (value.kind === "headerParam" && value.name) {
      flat.push(
        data.requestField({
          source: "header",
          name: value.name,
          type: HUB_T.string,
          origin,
          provenance: [webir.provenance("hub-ingest", "cwl:header")],
        }),
      );
      continue;
    }
    if (value.kind === "cookieParam" && value.name) {
      flat.push(
        data.requestField({
          source: "cookie",
          name: value.name,
          type: HUB_T.string,
          origin,
          provenance: [webir.provenance("hub-ingest", "cwl:cookie")],
        }),
      );
      continue;
    }
    if (value.kind === "bodyParam" && value.name) {
      flat.push(
        data.requestField({
          source: "body",
          name: value.name,
          type: HUB_T.string,
          origin,
          provenance: [webir.provenance("hub-ingest", "cwl:body")],
        }),
      );
      continue;
    }
    const val = value.value;
    if (Array.isArray(val)) {
      const arrayArgs = val.map((item) =>
        data.literal({
          value: item,
          type:
            typeof item === "string"
              ? HUB_T.string
              : typeof item === "boolean"
                ? HUB_T.bool
                : typeof item === "number"
                  ? HUB_T.int
                  : HUB_T.unknown,
          origin,
          provenance: [webir.provenance("hub-ingest", "cwl:array-val")],
        }),
      );
      flat.push(
        data.call({
          callee: "__array_literal",
          args: arrayArgs,
          type: HUB_T.unknown,
          origin,
          provenance: [webir.provenance("hub-ingest", "cwl:array")],
        }),
      );
      continue;
    }
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
        value: val,
        type: t,
        origin,
        provenance: [webir.provenance("hub-ingest", "cwl:object-val")],
      }),
    );
  }
  return data.call({
    callee: "__object_literal",
    args: flat,
    type: HUB_T.unknown,
    origin,
    provenance: [webir.provenance("hub-ingest", "cwl:object")],
  });
}

/**
 * Lower structured object to __object_literal call pattern.
 */
function lowerObjectBody(ctx, obj, loc) {
  const entries = Object.entries(obj).map(([key, val]) => ({
    key,
    value: { kind: "literal", value: val },
  }));
  return lowerObjectEntriesBody(ctx, entries, loc);
}

/**
 * @param {object} opts
 */
export function liftCwlFileToWebir(opts) {
  const { webir, builder, wr, source, file, language } = opts;
  const data = webir.dataDialect.builders(builder);
  const ctx = { data, webir, file };
  const parsed = opts.entryPath
    ? resolveCwlModuleFromPath(opts.entryPath)
    : parseCwlModuleResolved(source, file, { baseDir: opts.baseDir });
  const wrBuilders = wr ?? webir.webRequest.builders(builder);
  let middlewareUseCount = 0;
  let middlewareRootCount = 0;
  if (parsed.moduleUses?.length) {
    const mw = liftCwlModuleMiddlewareToWebir(parsed.moduleUses, { file, builder, wr: wrBuilders, webir });
    middlewareUseCount = mw.middlewareUseCount;
    middlewareRootCount = mw.middlewareRootCount;
  }
  if (parsed.moduleAuthUses?.length) {
    liftCwlAuthPresetsToWebir(parsed.moduleAuthUses, { file, builder, wr: wrBuilders, webir });
  }
  if (parsed.routes.length === 0 && middlewareUseCount === 0) {
    return { routeCount: 0, astRouteCount: 0, usedAst: false, middlewareUseCount, middlewareRootCount };
  }

  for (const r of parsed.routes) {
    let valueId;
    const loc = { file, line: r.line };
    const htmlBindings = {
      path: r.handlerPathParams ?? [],
      query: r.handlerQueryParams ?? [],
      load:
        r.loadBody?.kind === "object" && r.loadBody.entries
          ? r.loadBody.entries.map((e) => e.key)
          : [],
    };
    if (r.loadBody && r.body.kind === "html" && r.loadBody.kind === "object" && r.loadBody.entries) {
      const loadValueId = lowerObjectEntriesBody(ctx, r.loadBody.entries, loc);
      valueId = lowerHubPageWithLoadBody(ctx, loadValueId, r.body.value, loc, wrBuilders, htmlBindings);
    } else if (r.body.kind === "literal") {
      valueId = lowerHubLiteral(ctx, r.body.value, loc);
    } else if (r.body.kind === "object" && r.body.entries) {
      valueId = lowerObjectEntriesBody(ctx, r.body.entries, loc);
    } else if (r.body.kind === "object" && r.body.value) {
      valueId = lowerObjectBody(ctx, r.body.value, loc);
    } else if ((r.body.kind === "pathParam" || r.body.kind === "queryParam") && r.body.name) {
      valueId = lowerCwlParamField(
        ctx,
        r.body.kind === "pathParam" ? "path" : "query",
        r.body,
        { file, line: r.line ?? 1, column: 1 },
      );
    } else if (r.body.kind === "html") {
      valueId = lowerCwlHtmlTemplateBody(ctx, r.body.value, loc, wrBuilders, htmlBindings);
    } else if (r.body.kind === "ui") {
      let tree = r.body.tree;
      if (r.body.componentRef) {
        tree = resolveCwlUiComponent(parsed.components ?? [], r.body.componentRef, r.body.props ?? []);
        if (!tree) {
          valueId = hubHandlerBodyHole(ctx, `cwl:unknown-component:${r.body.componentRef}`, loc);
        }
      }
      if (tree) {
        valueId = lowerCwlUiTreeBody(ctx, tree, loc, htmlBindings);
      }
    } else {
      valueId = hubHandlerBodyHole(ctx, r.body.reason ?? "cwl:hole", loc);
    }
    valueId = wrapCwlExecutableEffects({ data, webir, builder, file }, valueId, r.effects ?? [], loc);
    const status = r.responseStatus ?? 200;
    const contentType =
      r.responseContentType ??
      (r.surfaceKind === "page" || r.body.kind === "html" || r.body.kind === "ui" ? "text/html; charset=utf-8" : undefined);
    const kind = contentType?.includes("json")
      ? "json"
      : contentType?.includes("html")
        ? "html"
        : contentType
          ? "text"
          : "json";
    let bodyId = valueId;
    const pageLoadHtml = Boolean(r.loadBody && r.body.kind === "html");
    if (!pageLoadHtml && (status !== 200 || contentType)) {
      bodyId = wrBuilders.response({
        attrs: { status, kind, contentType },
        value: valueId,
        origin: hubOrigin(file, r.line ?? 1),
        provenance: [
          webir.provenance("hub-ingest", contentType ? "cwl:response-content-type" : "cwl:response-status"),
        ],
      });
    }
    emitHubRoute({
      webir,
      builder,
      wr: wrBuilders,
      language,
      file,
      route: {
        method: r.method,
        path: r.path,
        name: r.name,
        line: r.line,
        pathParams: cwlPathParamsForWebir(r.path),
      },
      bodyId,
      handlerEffects: cwlEffectsToWebir(r.effects),
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
