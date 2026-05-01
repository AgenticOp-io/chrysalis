/**
 * @chrysalis/runtime-chimera — the dual-stack proxy that lets the legacy
 * PHP app and the Chrysalis-emitted app coexist behind a single origin.
 *
 * Modes: `legacy` / `cutover` / `shadow` / `canary` (percentage + stickiness
 * on modern-eligible routes). Demo file session bridge pairs with emit-hono
 * env vars; Redis for production sessions remains a follow-up.
 */

export { startChimera, type ChimeraHandle, type ChimeraStats } from "./proxy.js";
export {
  compileRules,
  routeFor,
  type CanarySettings,
  type ChimeraConfig,
  type Mode,
  type RouteRule,
  type Target,
  type CompiledRule,
} from "./routing.js";
export {
  CHIMERA_DEPLOY_CONFIG_KIND,
  CHIMERA_DEPLOY_CONFIG_SCHEMA_VERSION,
  computeChimeraDeployConfigHmacHex,
  computeChimeraDeployConfigHmacHexByKeyIds,
  parseChimeraDeployConfigJson,
  stableStringifyChimeraDeploySigningPayload,
  type ChimeraDeployConfigFile,
  type ParseChimeraDeployConfigOptions,
} from "./chimera-deploy-config.js";
