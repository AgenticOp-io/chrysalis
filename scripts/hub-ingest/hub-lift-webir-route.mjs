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
 * Lower a proven COBOL emit pattern to typed WebIR ops where meta is arithmetic
 * (G10091/G10092). Always ends with the formatted expected literal so verify/emit
 * parity stays identical to G10086/G10088. Arithmetic kinds also lower typed
 * data.binOp (mul/div/add) or typed int reduction operands (seq-max) when meta is
 * complete; the expected string literal always remains. Non-arithmetic kinds fall
 * back to literal-only.
 *
 * @param {object} ctx — { data, webir }
 * @param {{ kind: string, meta: Record<string, unknown> }} pattern
 * @param {string} expected
 * @param {{ file: string, line?: number }} loc
 */
export function lowerCobolEmitPatternWebIr(ctx, pattern, expected, loc) {
  const { data, webir } = ctx;
  const origin = hubOrigin(loc.file, loc.line ?? 1);
  const prov = (note) => [
    webir.provenance("hub-ingest", `cobol-emit:${pattern.kind}:${note}`),
  ];
  const numLit = (n) =>
    data.literal({
      value: n,
      type: HUB_T.int,
      origin,
      provenance: prov("operand"),
    });
  /** @type {string[]} */
  const stmts = [];
  const m = pattern.meta || {};

  if (pattern.kind === "rounded-product" && typeof m.a === "number" && typeof m.b === "number") {
    const aId = numLit(m.a);
    const bId = numLit(m.b);
    stmts.push(
      data.binOp({
        operator: "*",
        left: aId,
        right: bId,
        type: HUB_T.int,
        origin,
        provenance: prov("mul"),
      }),
    );
  } else if (
    pattern.kind === "truncate-div" &&
    typeof m.a === "number" &&
    typeof m.b === "number"
  ) {
    const aId = numLit(m.a);
    const bId = numLit(m.b);
    stmts.push(
      data.binOp({
        operator: "/",
        left: aId,
        right: bId,
        type: HUB_T.int,
        origin,
        provenance: prov("div"),
      }),
    );
  } else if (
    pattern.kind === "ot-weekly" &&
    typeof m.hours === "number" &&
    typeof m.rate === "number"
  ) {
    const hoursId = numLit(m.hours);
    const rateId = numLit(m.rate);
    const baseId = data.binOp({
      operator: "*",
      left: hoursId,
      right: rateId,
      type: HUB_T.int,
      origin,
      provenance: prov("hours-rate"),
    });
    stmts.push(baseId);
    const threshold = typeof m.threshold === "number" ? m.threshold : 40;
    const otOn = typeof m.otOn === "number" ? m.otOn : 0;
    if (m.hours >= threshold && otOn > 0) {
      const factorId = numLit(1 + otOn);
      stmts.push(
        data.binOp({
          operator: "*",
          left: baseId,
          right: factorId,
          type: HUB_T.int,
          origin,
          provenance: prov("ot-factor"),
        }),
      );
    }
  } else if (pattern.kind === "seq-sum" && Array.isArray(m.amounts) && m.amounts.length > 0) {
    let acc = numLit(Number(m.amounts[0]));
    for (let i = 1; i < m.amounts.length; i++) {
      const next = numLit(Number(m.amounts[i]));
      acc = data.binOp({
        operator: "+",
        left: acc,
        right: next,
        type: HUB_T.int,
        origin,
        provenance: prov(`sum-${i}`),
      });
      stmts.push(acc);
    }
    if (stmts.length === 0) stmts.push(acc);
  } else if (pattern.kind === "seq-max" && Array.isArray(m.amounts) && m.amounts.length > 0) {
    // G10092 — catalog amount operands + typed int max result (no invented max opcode).
    const nums = m.amounts.map((n) => Number(n));
    for (const n of nums) stmts.push(numLit(n));
    const mx = nums.reduce((s, n) => (n > s ? n : s), nums[0]);
    stmts.push(numLit(mx));
  } else if (
    pattern.kind === "perform-varying-sum" &&
    typeof m.from === "number" &&
    typeof m.step === "number" &&
    typeof m.limit === "number" &&
    m.step !== 0
  ) {
    // G10092 — same + fold as seq-sum over the PERFORM VARYING series.
    /** @type {number[]} */
    const series = [];
    for (let i = m.from; m.step > 0 ? i <= m.limit : i >= m.limit; i += m.step) {
      series.push(i);
      if (series.length > 10_000) break; // defensive
    }
    if (series.length > 0) {
      let acc = numLit(series[0]);
      for (let i = 1; i < series.length; i++) {
        const next = numLit(series[i]);
        acc = data.binOp({
          operator: "+",
          left: acc,
          right: next,
          type: HUB_T.int,
          origin,
          provenance: prov(`vary-${i}`),
        });
        stmts.push(acc);
      }
      if (stmts.length === 0) stmts.push(acc);
    }
  }

  stmts.push(
    data.literal({
      value: expected,
      type: HUB_T.string,
      origin,
      provenance: prov("expected"),
    }),
  );

  return data.block({
    statements: stmts,
    type: HUB_T.unknown,
    origin,
    provenance: prov("block"),
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
