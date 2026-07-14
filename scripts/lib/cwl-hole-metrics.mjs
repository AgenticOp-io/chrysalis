/** CWL markup hole census — generic (lifted from showcase POC harness). */

/**
 * @param {string} cwlText
 */
export function countCwlMarkupHoles(cwlText) {
  const unescaped = cwlText.replace(/\\"/g, '"');
  /** @type {Record<string, number>} */
  const reasons = {};
  for (const m of unescaped.matchAll(/data-cwl-hole="([^"]+)"/g)) {
    reasons[m[1]] = (reasons[m[1]] ?? 0) + 1;
  }
  const fakeIf = (unescaped.match(/data-cwl-hole-detail="\/if"/g) || []).length;
  const fakeEach = (unescaped.match(/data-cwl-hole-detail="\/each"/g) || []).length;
  const settledKeys = [
    "isLoading",
    "loading",
    "error",
    "success",
    "statusLoading",
    "statusError",
    "showCreateModal",
    "showEditModal",
    "showDeleteConfirm",
  ];
  let settledIfLeft = 0;
  for (const k of settledKeys) {
    const re = new RegExp(
      `data-cwl-hole="legacy:markup-lift-svelte-if" data-cwl-hole-detail="${k}"`,
      "g",
    );
    settledIfLeft += (unescaped.match(re) || []).length;
  }
  const total = Object.values(reasons).reduce((a, b) => a + b, 0);
  return { total, reasons, fakeIf, fakeEach, settledIfLeft };
}

/**
 * Bucket hole reasons for honest bound reporting.
 * @param {Record<string, number>} reasons
 */
export function classifyCwlHoleBuckets(reasons) {
  /** @type {Record<string, number>} */
  const buckets = {
    noSourceRoute: 0,
    svelteComponent: 0,
    svelteIf: 0,
    svelteEach: 0,
    svelteInterp: 0,
    otherMarkupLift: 0,
    other: 0,
  };
  for (const [reason, count] of Object.entries(reasons)) {
    if (reason === "legacy:markup-no-source-route") buckets.noSourceRoute += count;
    else if (reason === "legacy:markup-lift-svelte-component") buckets.svelteComponent += count;
    else if (reason === "legacy:markup-lift-svelte-if") buckets.svelteIf += count;
    else if (reason === "legacy:markup-lift-svelte-each") buckets.svelteEach += count;
    else if (reason === "legacy:markup-lift-svelte-interp") buckets.svelteInterp += count;
    else if (reason.startsWith("legacy:markup-lift-")) buckets.otherMarkupLift += count;
    else buckets.other += count;
  }
  return buckets;
}

/**
 * @param {ReturnType<typeof countCwlMarkupHoles>} metrics
 * @param {object} bound
 */
export function evaluateCwlHoleBound(metrics, bound) {
  const buckets = classifyCwlHoleBuckets(metrics.reasons);
  const checks = {
    totalMin: metrics.total >= bound.totalMin,
    totalMax: metrics.total <= bound.totalMax,
    fakeIfZero: metrics.fakeIf === 0,
    fakeEachZero: metrics.fakeEach === 0,
    settledIfZero: metrics.settledIfLeft === 0,
    noSourceMin: (metrics.reasons["legacy:markup-no-source-route"] ?? 0) >= bound.noSourceMin,
    componentMin: buckets.svelteComponent >= bound.componentMin,
    genieacsAbsent: !Object.keys(metrics.reasons).some((r) => /genieacs/i.test(r)),
  };
  if (bound.noSourceMax != null) {
    checks.noSourceMax =
      (metrics.reasons["legacy:markup-no-source-route"] ?? 0) <= bound.noSourceMax;
  }
  if (bound.componentMax != null) {
    checks.componentMax = buckets.svelteComponent <= bound.componentMax;
  }
  if (bound.maxOther != null) {
    checks.otherMax = buckets.other <= bound.maxOther;
  }
  const ok = Object.values(checks).every(Boolean);
  return { ok, checks, buckets };
}

/** @deprecated Prefer countCwlMarkupHoles */
export const countWispMarkupHoles = countCwlMarkupHoles;
/** @deprecated Prefer classifyCwlHoleBuckets */
export const classifyWispHoleBuckets = classifyCwlHoleBuckets;
/** @deprecated Prefer evaluateCwlHoleBound */
export const evaluateWispShowcaseBound = evaluateCwlHoleBound;
