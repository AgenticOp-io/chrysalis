/** Shared WebIR route emission for hub AST/heuristic lifts. */
import { lowerCwlHtmlTemplateBody } from "./cwl-html-template.mjs";
import { lowerCwlUiTreeBody } from "./cwl-ui-tree.mjs";

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
 * @param {object} ctx — { data, webir }
 * @param {Record<string, string | number | boolean>} obj
 * @param {{ file: string, line?: number }} loc
 */
export function lowerHubObjectLiteral(ctx, obj, loc) {
  const { data, webir } = ctx;
  const origin = hubOrigin(loc.file, loc.line ?? 1);
  const flat = [];
  for (const [key, val] of Object.entries(obj)) {
    const valType =
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
        provenance: [webir.provenance("hub-ingest", "object-key")],
      }),
    );
    flat.push(
      data.literal({
        value: val,
        type: valType,
        origin,
        provenance: [webir.provenance("hub-ingest", "object-val")],
      }),
    );
  }
  const objId = data.call({
    callee: "__object_literal",
    args: flat,
    type: HUB_T.unknown,
    origin,
    provenance: [webir.provenance("hub-ingest", "object-literal")],
  });
  return data.block({
    statements: [objId],
    type: HUB_T.unknown,
    origin,
    provenance: [webir.provenance("hub-ingest", "object-literal")],
  });
}

/**
 * @param {object} ctx — { data, effect, webir }
 * @param {number} status
 * @param {{ file: string, line?: number }} loc
 */
export function lowerHubStatusOnly(ctx, status, loc) {
  const { data, effect, webir } = ctx;
  const origin = hubOrigin(loc.file, loc.line ?? 1);
  const statusId = effect.httpError({
    status,
    message: null,
    origin,
    provenance: [webir.provenance("hub-ingest", "status-only")],
  });
  const bodyId = lowerHubObjectLiteral(ctx, {}, loc);
  return data.block({
    statements: [statusId, bodyId],
    type: HUB_T.unknown,
    origin,
    provenance: [webir.provenance("hub-ingest", "status-only")],
  });
}

/**
 * @param {object} ctx
 * @param {string} reason
 * @param {{ file: string, line?: number }} loc
 */
/**
 * @param {object} ctx — { data, webir, file }
 * @param {string} html
 * @param {{ file: string, line?: number }} loc
 * @param {object} wr — web.request builders
 */
export function lowerHubHtmlPageBody(ctx, html, loc, wr, bindings = null) {
  if (bindings && (bindings.path?.length || bindings.query?.length || bindings.load?.length)) {
    return lowerCwlHtmlTemplateBody(ctx, html, loc, wr, bindings);
  }
  const { data, webir } = ctx;
  const origin = hubOrigin(loc.file, loc.line ?? 1);
  const litId = data.literal({
    value: html,
    type: HUB_T.string,
    origin,
    provenance: [webir.provenance("hub-ingest", "svelte-page-html")],
  });
  return wr.response({
    attrs: { status: 200, kind: "html", contentType: "text/html; charset=utf-8" },
    value: litId,
    origin,
    provenance: [webir.provenance("hub-ingest", "svelte-page-response")],
  });
}

/**
 * Page handler with RFC-0013 load payload + HTML response (G1159–G1160).
 * @param {object} ctx
 * @param {string} loadValueId
 * @param {string} html
 * @param {{ file: string, line?: number }} loc
 * @param {object} wr
 */
export function lowerHubPageWithLoadBody(ctx, loadValueId, html, loc, wr, bindings = null) {
  const { data, webir } = ctx;
  const origin = hubOrigin(loc.file, loc.line ?? 1);
  const loadId = data.call({
    callee: "__page_load",
    args: [loadValueId],
    type: HUB_T.unknown,
    origin,
    provenance: [webir.provenance("hub-ingest", "cwl-page-load")],
  });
  const responseId = lowerHubHtmlPageBody(ctx, html, loc, wr, bindings);
  return data.block({
    statements: [loadId, responseId],
    type: HUB_T.unknown,
    origin,
    provenance: [webir.provenance("hub-ingest", "cwl-page-load-html")],
  });
}

/**
 * Page handler with RFC-0013 load + RFC-0019 UI tree (Phase 20).
 * @param {object} ctx
 * @param {import('@chrysalis/webir').NodeId} loadValueId
 * @param {object} tree
 * @param {{ file: string, line?: number }} loc
 * @param {{ path?: string[], query?: string[], load?: string[] }} bindings
 */
export function lowerHubPageWithLoadAndUiBody(ctx, loadValueId, tree, loc, bindings = {}) {
  const { data, webir } = ctx;
  const origin = hubOrigin(loc.file, loc.line ?? 1);
  const loadId = data.call({
    callee: "__page_load",
    args: [loadValueId],
    type: HUB_T.unknown,
    origin,
    provenance: [webir.provenance("hub-ingest", "cwl-page-load")],
  });
  const uiId = lowerCwlUiTreeBody(ctx, tree, loc, bindings);
  return data.block({
    statements: [loadId, uiId],
    type: HUB_T.unknown,
    origin,
    provenance: [webir.provenance("hub-ingest", "cwl-page-load-ui")],
  });
}

export function hubHandlerBodyHole(ctx, reason, loc, extraAttrs) {
  const { data, webir } = ctx;
  const origin = hubOrigin(loc.file, loc.line ?? 1);
  return data.hole({
    reason,
    input: HUB_T.unknown,
    output: HUB_T.unknown,
    origin,
    provenance: [webir.provenance("hub-ingest", reason)],
    attrs: extraAttrs && typeof extraAttrs === "object" ? extraAttrs : undefined,
  });
}

/**
 * @param {object} opts
 */
export function emitHubRoute(opts) {
  const { webir, builder, wr, language, file, route, bodyId, handlerEffects = [] } = opts;
  const origin = hubOrigin(file, route.line ?? 1);
  const pathParams = route.pathParams?.length ? route.pathParams : [];
  const handlerId = wr.handler({
    attrs: {
      name: route.name || `${route.method}_${String(route.path).replace(/[^a-zA-Z0-9]+/g, "_")}`,
      input: HUB_T.unknown,
      output: HUB_T.unknown,
    },
    body: bodyId,
    effects: handlerEffects,
    origin,
    provenance: [webir.provenance("hub-ingest", `hub-lift:${language}`)],
  });
  const routeId = wr.route({
    attrs: { method: route.method, path: route.path, pathParams },
    handler: handlerId,
    origin,
    provenance: [webir.provenance("hub-ingest", `route:${language}`)],
  });
  builder.addRoot(routeId);
}
