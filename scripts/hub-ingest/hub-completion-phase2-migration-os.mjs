/**
 * Hub completion Phase 2 Migration OS section (G5812).
 */
export const HUB_COMPLETION_PHASE2_MIGRATION_OS_SCHEMA_VERSION = 1;

/**
 * @param {{
 *   deliveryDashboardSmoke?: { ok?: boolean },
 *   migrationOsMegaBatch?: { ok?: boolean },
 *   strategicPlanPhase2Entry?: { ok?: boolean },
 *   strategicPlanPhase2LicenseTier?: { ok?: boolean },
 * }} smokes
 */
export function buildHubCompletionPhase2MigrationOsSection(smokes = {}) {
  const deliveryDashboard = {
    ok: smokes.deliveryDashboardSmoke?.ok === true,
    script: "pnpm run hub:delivery-dashboard-smoke",
  };
  const multiOrigin = {
    ok: smokes.migrationOsMegaBatch?.ok === true,
    script: "pnpm run hub:migration-os-mega-batch-smoke",
  };
  const entry = {
    ok: smokes.strategicPlanPhase2Entry?.ok === true,
    script: "pnpm run hub:strategic-plan-phase2-migration-os-entry-smoke",
  };
  const licenseTier = {
    ok: smokes.strategicPlanPhase2LicenseTier?.ok === true,
    script: "pnpm run hub:strategic-plan-phase2-license-tier-smoke",
  };
  const ok =
    deliveryDashboard.ok && multiOrigin.ok && entry.ok && licenseTier.ok;
  return {
    schemaVersion: HUB_COMPLETION_PHASE2_MIGRATION_OS_SCHEMA_VERSION,
    ok,
    doc: "docs/MIGRATION-OS-PHASE-2.md",
    script: "pnpm run hub:strategic-plan-phase2-migration-os-close-smoke",
    deliveryDashboard,
    multiOrigin,
    entry,
    licenseTier,
  };
}

/** @param {unknown} section */
export function validateHubCompletionPhase2MigrationOsSection(section) {
  if (!section || typeof section !== "object") return false;
  const s = /** @type {Record<string, unknown>} */ (section);
  return (
    s.schemaVersion === HUB_COMPLETION_PHASE2_MIGRATION_OS_SCHEMA_VERSION &&
    typeof s.ok === "boolean" &&
    typeof s.doc === "string" &&
    s.doc.includes("MIGRATION-OS-PHASE-2") &&
    typeof s.deliveryDashboard === "object" &&
    typeof s.multiOrigin === "object" &&
    typeof s.entry === "object" &&
    typeof s.licenseTier === "object"
  );
}
