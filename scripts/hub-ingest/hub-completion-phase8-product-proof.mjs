/**
 * Hub completion Phase 8 product proof section (G6122).
 */
export const HUB_COMPLETION_PHASE8_PRODUCT_PROOF_SCHEMA_VERSION = 1;

/**
 * @param {{
 *   strategicPlanPhase8Close?: { ok?: boolean; strict?: boolean },
 *   gceStrictArtifact?: { ok?: boolean; skip?: string },
 * }} smokes
 */
export function buildHubCompletionPhase8ProductProofSection(smokes = {}) {
  const skipFastClose = {
    ok: smokes.strategicPlanPhase8Close?.ok === true,
    script: "pnpm run hub:strategic-plan-phase8-product-proof-close-smoke",
    note: "skip-fast path; strict proof on GCE via test:gce:phase8-strict",
  };
  const gceStrict = {
    ok: smokes.gceStrictArtifact?.ok === true,
    script: "pnpm run test:gce:phase8-strict",
    marker: "reports/ci/gce-phase8-strict.ok",
    skip: smokes.gceStrictArtifact?.skip ?? null,
  };
  const gceStrictSatisfied = gceStrict.ok || typeof gceStrict.skip === "string";
  const ok =
    gceStrictSatisfied &&
    (skipFastClose.ok || typeof gceStrict.skip === "string");
  return {
    schemaVersion: HUB_COMPLETION_PHASE8_PRODUCT_PROOF_SCHEMA_VERSION,
    ok,
    doc: "docs/PRODUCT-PROOF-PHASE-8.md",
    script: "pnpm run hub:strategic-plan-phase9-operational-close-smoke",
    skipFastClose,
    gceStrict,
    strictClosePassed: smokes.strategicPlanPhase8Close?.strict === true,
  };
}

/** @param {unknown} section */
export function validateHubCompletionPhase8ProductProofSection(section) {
  if (!section || typeof section !== "object") return false;
  const s = /** @type {Record<string, unknown>} */ (section);
  return (
    s.schemaVersion === HUB_COMPLETION_PHASE8_PRODUCT_PROOF_SCHEMA_VERSION &&
    typeof s.ok === "boolean" &&
    typeof s.doc === "string" &&
    s.doc.includes("PRODUCT-PROOF-PHASE-8") &&
    typeof s.skipFastClose === "object" &&
    typeof s.gceStrict === "object"
  );
}
