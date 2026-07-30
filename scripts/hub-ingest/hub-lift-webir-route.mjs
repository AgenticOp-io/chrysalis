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
 * (G10091/G10092), evaluate/indexed catalogs (G10093), nested-if / SEARCH /
 * evaluate-subject / rounded-chain (G10095), seq-ctl / seq-key / entry-alt /
 * bill-pipeline / indexed-row catalogs (G10096), or card-* fee/pay/status
 * catalogs (G10097 literal-only). Always ends
 * with the formatted expected literal so verify/emit parity stays identical to
 * G10086/G10088. Arithmetic kinds also lower typed data.binOp (mul/div/add) or
 * typed int reduction operands (seq-max) when meta is complete. Catalog kinds
 * emit operands/tables as literals only — no IF/EVALUATE/SEARCH/ISAM invent.
 * The expected string literal always remains.
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
  } else if (
    pattern.kind === "evaluate-phase" &&
    m.entry != null &&
    m.phases &&
    typeof m.phases === "object"
  ) {
    // G10093 — entry key + phase table ints + selected phase int (no EVALUATE invent).
    stmts.push(
      data.literal({
        value: String(m.entry),
        type: HUB_T.string,
        origin,
        provenance: prov("entry"),
      }),
    );
    for (const [k, v] of Object.entries(/** @type {Record<string, unknown>} */ (m.phases))) {
      stmts.push(
        data.literal({
          value: String(k),
          type: HUB_T.string,
          origin,
          provenance: prov(`phase-key-${k}`),
        }),
      );
      if (typeof v === "number") stmts.push(numLit(v));
    }
    const selected = /** @type {Record<string, number>} */ (m.phases)[String(m.entry)];
    if (typeof selected === "number") stmts.push(numLit(selected));
  } else if (
    pattern.kind === "evaluate-func" &&
    m.func != null &&
    m.codes &&
    typeof m.codes === "object"
  ) {
    // G10093 — func key + code table ints + selected rc int (no EVALUATE invent).
    stmts.push(
      data.literal({
        value: String(m.func),
        type: HUB_T.string,
        origin,
        provenance: prov("func"),
      }),
    );
    for (const [k, v] of Object.entries(/** @type {Record<string, unknown>} */ (m.codes))) {
      stmts.push(
        data.literal({
          value: String(k),
          type: HUB_T.string,
          origin,
          provenance: prov(`code-key-${k}`),
        }),
      );
      if (typeof v === "number") stmts.push(numLit(v));
    }
    const selected = /** @type {Record<string, number>} */ (m.codes)[String(m.func).toUpperCase()];
    if (typeof selected === "number") stmts.push(numLit(selected));
  } else if (
    pattern.kind === "seq-ctl-func-sum" &&
    Array.isArray(m.funcs) &&
    m.codes &&
    typeof m.codes === "object"
  ) {
    // G10096 — func list + code table + selected sum (no EVALUATE invent).
    let sum = 0;
    for (const f of m.funcs) {
      stmts.push(
        data.literal({
          value: String(f),
          type: HUB_T.string,
          origin,
          provenance: prov(`func-${f}`),
        }),
      );
      const code = /** @type {Record<string, number>} */ (m.codes)[String(f).toUpperCase()]
        ?? /** @type {Record<string, number>} */ (m.codes)[String(f)];
      if (typeof code === "number") {
        stmts.push(numLit(code));
        sum += code;
      }
    }
    for (const [k, v] of Object.entries(/** @type {Record<string, unknown>} */ (m.codes))) {
      stmts.push(
        data.literal({
          value: String(k),
          type: HUB_T.string,
          origin,
          provenance: prov(`code-key-${k}`),
        }),
      );
      if (typeof v === "number") stmts.push(numLit(v));
    }
    if (sum > 0) stmts.push(numLit(sum));
  } else if (pattern.kind === "entry-alt" && m.entry != null && typeof m.phase === "number") {
    // G10096 — ENTRY name + phase int (no ENTRY invent).
    stmts.push(
      data.literal({
        value: String(m.entry),
        type: HUB_T.string,
        origin,
        provenance: prov("entry"),
      }),
    );
    stmts.push(numLit(m.phase));
  } else if (pattern.kind === "bill-pipeline") {
    // G10096 — bill fee/late/interest operands + result (no IF/COMPUTE invent).
    for (const key of ["bal", "feeRate", "intRate", "days", "thresh", "lateFee", "result"]) {
      const v = m[key];
      if (typeof v === "number") stmts.push(numLit(v));
    }
  } else if (pattern.kind === "card-pay-option") {
    // G10097 — pay option + rates/fees + result (no EVALUATE invent).
    if (m.option != null) {
      stmts.push(
        data.literal({
          value: String(m.option),
          type: HUB_T.string,
          origin,
          provenance: prov("option"),
        }),
      );
    }
    for (const key of ["bal", "pct", "minPay", "days", "thresh", "lateFee", "result"]) {
      const v = m[key];
      if (typeof v === "number") stmts.push(numLit(v));
    }
  } else if (pattern.kind === "card-status-multi-rate") {
    // G10097 — status + multi-rate table + late + result (no EVALUATE invent).
    if (m.status != null) {
      stmts.push(
        data.literal({
          value: String(m.status),
          type: HUB_T.string,
          origin,
          provenance: prov("status"),
        }),
      );
    }
    for (const key of ["bal", "rateA", "rateD", "rateC", "days", "thresh", "lateFee", "result"]) {
      const v = m[key];
      if (typeof v === "number") stmts.push(numLit(v));
    }
  } else if (pattern.kind === "card-account-fee-table" && Array.isArray(m.accounts)) {
    // G10097 — per-account status/bal/days + rates + result (no table invent).
    for (const acct of m.accounts) {
      if (!acct || typeof acct !== "object") continue;
      const a = /** @type {Record<string, unknown>} */ (acct);
      if (a.status != null) {
        stmts.push(
          data.literal({
            value: String(a.status),
            type: HUB_T.string,
            origin,
            provenance: prov(`acct-${a.status}`),
          }),
        );
      }
      if (typeof a.bal === "number") stmts.push(numLit(a.bal));
      if (typeof a.days === "number") stmts.push(numLit(a.days));
    }
    for (const key of ["rateA", "rateD", "lateFee", "thresh", "result"]) {
      const v = m[key];
      if (typeof v === "number") stmts.push(numLit(v));
    }
  } else if (
    pattern.kind === "card-fee-schedule" &&
    m.schedule &&
    typeof m.schedule === "object" &&
    Array.isArray(m.txns)
  ) {
    // G10097 — schedule codes/rates + txn codes/amts + result (no SEARCH invent).
    for (const [k, v] of Object.entries(/** @type {Record<string, unknown>} */ (m.schedule))) {
      stmts.push(
        data.literal({
          value: String(k),
          type: HUB_T.string,
          origin,
          provenance: prov(`sched-${k}`),
        }),
      );
      if (typeof v === "number") stmts.push(numLit(v));
    }
    for (const txn of m.txns) {
      if (!txn || typeof txn !== "object") continue;
      const t = /** @type {Record<string, unknown>} */ (txn);
      if (t.code != null) {
        stmts.push(
          data.literal({
            value: String(t.code),
            type: HUB_T.string,
            origin,
            provenance: prov(`txn-${t.code}`),
          }),
        );
      }
      if (typeof t.amt === "number") stmts.push(numLit(t.amt));
    }
    if (typeof m.result === "number") stmts.push(numLit(m.result));
  } else if (
    (pattern.kind === "indexed-key-read" ||
      pattern.kind === "indexed-alt-key-read" ||
      pattern.kind === "indexed-alt-start-rewrite" ||
      pattern.kind === "indexed-delete" ||
      pattern.kind === "indexed-start-rewrite" ||
      pattern.kind === "indexed-start-equal-next" ||
      pattern.kind === "indexed-start-equal-prev" ||
      pattern.kind === "indexed-start-gt-next" ||
      pattern.kind === "indexed-start-less-next" ||
      pattern.kind === "indexed-start-less-prev" ||
      pattern.kind === "indexed-start-ngt-next" ||
      pattern.kind === "indexed-start-ngt-prev" ||
      pattern.kind === "indexed-start-nless-next" ||
      pattern.kind === "indexed-start-nless-prev" ||
      pattern.kind === "seq-key-scan" ||
      pattern.kind === "seq-key-update" ||
      pattern.kind === "seq-key-range") &&
    m.rows &&
    typeof m.rows === "object"
  ) {
    // G10093/G10096 — row key/value catalog + find/start/delta/delKey (no ISAM invent).
    const pushKeyOrNum = (raw, note) => {
      const n = Number(raw);
      if (typeof raw === "number" || (typeof raw === "string" && Number.isFinite(n) && String(n) === raw)) {
        stmts.push(numLit(typeof raw === "number" ? raw : n));
      } else if (raw != null) {
        stmts.push(
          data.literal({
            value: String(raw),
            type: HUB_T.string,
            origin,
            provenance: prov(note),
          }),
        );
      }
    };
    for (const [k, v] of Object.entries(/** @type {Record<string, unknown>} */ (m.rows))) {
      pushKeyOrNum(k, `row-key-${k}`);
      if (typeof v === "number") stmts.push(numLit(v));
    }
    if (m.find != null) pushKeyOrNum(m.find, "find");
    if (m.start != null) pushKeyOrNum(m.start, "start");
    if (typeof m.delta === "number") stmts.push(numLit(m.delta));
    if (m.delKey != null) pushKeyOrNum(m.delKey, "delKey");
  } else if (
    pattern.kind === "nested-if-grade" &&
    typeof m.score === "number" &&
    Array.isArray(m.bands) &&
    m.bands.length > 0
  ) {
    // G10095 — score + band thresholds/grades + selected grade (no IF invent).
    stmts.push(numLit(m.score));
    let selected =
      typeof m.elseGrade === "number" ? m.elseGrade : undefined;
    for (const band of m.bands) {
      if (!band || typeof band !== "object") continue;
      const th = /** @type {{ threshold?: unknown, grade?: unknown }} */ (band).threshold;
      const gr = /** @type {{ threshold?: unknown, grade?: unknown }} */ (band).grade;
      if (typeof th === "number") stmts.push(numLit(th));
      if (typeof gr === "number") stmts.push(numLit(gr));
    }
    // First matching band when sorted high→low (emit meta order).
    for (const band of m.bands) {
      if (!band || typeof band !== "object") continue;
      const th = /** @type {{ threshold?: unknown, grade?: unknown }} */ (band).threshold;
      const gr = /** @type {{ threshold?: unknown, grade?: unknown }} */ (band).grade;
      if (typeof th === "number" && typeof gr === "number" && m.score >= th) {
        selected = gr;
        break;
      }
    }
    if (typeof selected === "number") stmts.push(numLit(selected));
  } else if (
    pattern.kind === "search-table" &&
    m.table &&
    typeof m.table === "object" &&
    m.find != null
  ) {
    // G10095 — table keys/values + find + hit value (no SEARCH invent).
    for (const [k, v] of Object.entries(/** @type {Record<string, unknown>} */ (m.table))) {
      const kn = Number(k);
      if (Number.isFinite(kn)) stmts.push(numLit(kn));
      if (typeof v === "number") stmts.push(numLit(v));
    }
    const findN = Number(m.find);
    if (Number.isFinite(findN)) stmts.push(numLit(findN));
    const hit = /** @type {Record<string, number>} */ (m.table)[String(m.find)];
    if (typeof hit === "number") stmts.push(numLit(hit));
    else if (typeof m.miss === "number") stmts.push(numLit(m.miss));
  } else if (
    pattern.kind === "evaluate-subject" &&
    typeof m.subject === "number" &&
    m.branches &&
    typeof m.branches === "object"
  ) {
    // G10095 — subject + WHEN branches + selected/other (no EVALUATE invent).
    stmts.push(numLit(m.subject));
    for (const [k, v] of Object.entries(/** @type {Record<string, unknown>} */ (m.branches))) {
      const kn = Number(k);
      if (Number.isFinite(kn)) stmts.push(numLit(kn));
      if (typeof v === "number") stmts.push(numLit(v));
    }
    const selected = /** @type {Record<string, number>} */ (m.branches)[String(m.subject)];
    if (typeof selected === "number") stmts.push(numLit(selected));
    else if (typeof m.other === "number") stmts.push(numLit(m.other));
  } else if (pattern.kind === "rounded-chain") {
    // G10095 — fee/interest chain operands + result (no COMPUTE invent).
    for (const key of ["bal", "feeRate", "intRate", "result"]) {
      const v = m[key];
      if (typeof v === "number") stmts.push(numLit(v));
    }
    if (Array.isArray(m.steps)) {
      for (const step of m.steps) {
        stmts.push(
          data.literal({
            value: String(step),
            type: HUB_T.string,
            origin,
            provenance: prov(`step-${step}`),
          }),
        );
      }
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
