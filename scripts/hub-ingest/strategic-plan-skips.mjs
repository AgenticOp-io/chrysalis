/**
 * Central skip resolver for strategic-plan reinforcement gates.
 * Strict mode (GCE / CI): CHRYSALIS_STRICT_STRATEGIC_PLAN=1 or GITHUB_ACTIONS=true — no skips.
 */

/** @returns {boolean} */
export function isStrategicPlanStrict(opts = {}) {
  if (opts.strict === false) return false;
  if (opts.strict === true) return true;
  if (process.env.CHRYSALIS_STRICT_STRATEGIC_PLAN === "1") return true;
  return process.env.GITHUB_ACTIONS === "true";
}

/** @param {Record<string, boolean | undefined>} opts */
function hasExplicitSkipOverrides(opts) {
  return (
    opts.skipOracleVerify === true ||
    opts.skipEmitHttp === true ||
    opts.skipGoldVerify === true ||
    opts.skipProjectCwlRoundtrip === true ||
    opts.skipCwlRfcRoundtrip === true ||
    opts.skipLaravelLiveGaps === true ||
    opts.skipMigrationOsMegaBatch === true ||
    opts.skipMigrationOsStandaloneBatch === true ||
    opts.skipPhpWedgeFlagships === true ||
    opts.skipEmitParityFlagships === true ||
    opts.skipChimeraOriginBatch === true
  );
}

/**
 * @param {Record<string, boolean | undefined>} [opts]
 * @returns {{
 *   strict: boolean;
 *   skipOracleVerify: boolean;
 *   skipEmitHttp: boolean;
 *   skipGoldVerify: boolean;
 *   skipProjectCwlRoundtrip: boolean;
 *   skipCwlRfcRoundtrip: boolean;
 *   skipLaravelLiveGaps: boolean;
 *   skipMigrationOsMegaBatch: boolean;
 *   skipMigrationOsStandaloneBatch: boolean;
 *   skipPhpWedgeFlagships: boolean;
 *   skipEmitParityFlagships: boolean;
 *   skipChimeraOriginBatch: boolean;
 * }}
 */
export function resolveStrategicPlanSkips(opts = {}) {
  const envStrict = isStrategicPlanStrict(opts);
  if (envStrict && !hasExplicitSkipOverrides(opts)) {
    return {
      strict: true,
      skipOracleVerify: false,
      skipEmitHttp: false,
      skipGoldVerify: false,
      skipProjectCwlRoundtrip: false,
      skipCwlRfcRoundtrip: false,
      skipLaravelLiveGaps: false,
      skipMigrationOsMegaBatch: false,
      skipMigrationOsStandaloneBatch: false,
      skipPhpWedgeFlagships: false,
      skipEmitParityFlagships: false,
      skipChimeraOriginBatch: false,
    };
  }
  return {
    strict: false,
    skipOracleVerify:
      opts.skipOracleVerify === true || process.env.CHRYSALIS_STRATEGIC_PLAN_SKIP_ORACLE_VERIFY === "1",
    skipEmitHttp:
      opts.skipEmitHttp === true || process.env.CHRYSALIS_STRATEGIC_PLAN_SKIP_EMIT_HTTP === "1",
    skipGoldVerify:
      opts.skipGoldVerify === true || process.env.CHRYSALIS_STRATEGIC_PLAN_SKIP_FLAGSHIP_GOLD === "1",
    skipProjectCwlRoundtrip:
      opts.skipProjectCwlRoundtrip === true ||
      process.env.CHRYSALIS_STRATEGIC_PLAN_SKIP_PROJECT_CWL_ROUNDTRIP === "1",
    skipCwlRfcRoundtrip:
      opts.skipCwlRfcRoundtrip === true ||
      process.env.CHRYSALIS_STRATEGIC_PLAN_SKIP_CWL_RFC_ROUNDTRIP === "1",
    skipLaravelLiveGaps:
      opts.skipLaravelLiveGaps === true ||
      process.env.CHRYSALIS_STRATEGIC_PLAN_SKIP_LARAVEL_LIVE_GAPS === "1",
    skipMigrationOsMegaBatch:
      opts.skipMigrationOsMegaBatch === true ||
      process.env.CHRYSALIS_STRATEGIC_PLAN_SKIP_MIGRATION_OS_MEGA_BATCH === "1",
    skipMigrationOsStandaloneBatch:
      opts.skipMigrationOsStandaloneBatch === true ||
      process.env.CHRYSALIS_STRATEGIC_PLAN_SKIP_MIGRATION_OS_STANDALONE_BATCH === "1",
    skipPhpWedgeFlagships:
      opts.skipPhpWedgeFlagships === true ||
      process.env.CHRYSALIS_STRATEGIC_PLAN_SKIP_PHP_WEDGE_FLAGSHIPS === "1",
    skipEmitParityFlagships:
      opts.skipEmitParityFlagships === true ||
      process.env.CHRYSALIS_STRATEGIC_PLAN_SKIP_EMIT_PARITY_FLAGSHIPS === "1",
    skipChimeraOriginBatch:
      opts.skipChimeraOriginBatch === true ||
      process.env.CHRYSALIS_STRATEGIC_PLAN_SKIP_CHIMERA_ORIGIN_BATCH === "1",
  };
}

/**
 * Map resolved skips to gate option keys used by hub-cwl-fullstack-gates.mjs.
 * @param {ReturnType<typeof resolveStrategicPlanSkips>} skips
 */
export function strategicPlanSkipsToGateOpts(skips) {
  return {
    strict: skips.strict,
    skipOracleVerify: skips.skipOracleVerify,
    skipEmitHttp: skips.skipEmitHttp,
    skipGoldVerify: skips.skipGoldVerify,
    skipRoundtrip: skips.skipProjectCwlRoundtrip,
    skipRfcRoundtrip: skips.skipCwlRfcRoundtrip,
    skipLive: skips.skipLaravelLiveGaps,
    skipMegaBatch: skips.skipMigrationOsMegaBatch,
    skipStandaloneBatch: skips.skipMigrationOsStandaloneBatch,
    skipFlagships: skips.skipPhpWedgeFlagships,
    skipEmitParityFlagships: skips.skipEmitParityFlagships,
    skipOriginBatch: skips.skipChimeraOriginBatch,
  };
}
