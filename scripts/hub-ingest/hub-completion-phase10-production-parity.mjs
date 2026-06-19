/**
 * Hub completion Phase 10 production parity section (G6242).
 */
export const HUB_COMPLETION_PHASE10_PRODUCTION_PARITY_SCHEMA_VERSION = 2;

/**
 * @param {{
 *   strategicPlanPhase10Close?: { ok?: boolean },
 * }} smokes
 */
export function buildHubCompletionPhase10ProductionParitySection(smokes = {}) {
  const close = {
    ok: smokes.strategicPlanPhase10Close?.ok === true,
    script: "pnpm run hub:strategic-plan-phase10-production-parity-close-smoke",
    note: "skip-fast path; includes Runtime Phase C session/SQL parity gates",
  };
  return {
    schemaVersion: HUB_COMPLETION_PHASE10_PRODUCTION_PARITY_SCHEMA_VERSION,
    ok: close.ok,
    doc: "docs/PRODUCTION-PARITY-PHASE-10.md",
    script: "pnpm run hub:strategic-plan-phase10-production-parity-close-smoke",
    depthScript: "pnpm run hub:strategic-plan-phase10-depth-smoke",
    close,
    runtimePhaseC: "active",
    runtimePhaseCDepth: "G6208",
    wordpressVertical: "unblocked",
    wordpressDepth: "G6216",
    matrixExpansion: "unblocked",
    matrixDepth: "G6222",
    multiLanguageEvidence: "second-oracle-path",
    expressOraclePair: "G6231",
    depthGate: "G6241",
  };
}

/** @param {unknown} section */
export function validateHubCompletionPhase10ProductionParitySection(section) {
  if (!section || typeof section !== "object") return false;
  const s = /** @type {Record<string, unknown>} */ (section);
  return (
    s.schemaVersion === HUB_COMPLETION_PHASE10_PRODUCTION_PARITY_SCHEMA_VERSION &&
    typeof s.ok === "boolean" &&
    typeof s.doc === "string" &&
    s.doc.includes("PRODUCTION-PARITY-PHASE-10") &&
    s.runtimePhaseC === "active"
  );
}
