/**
 * @chrysalis/runtime-chimera — the dual-stack proxy that lets the legacy
 * PHP app and the Chrysalis-emitted app coexist behind a single origin.
 *
 * Milestone 1 scope: per-path routing with `legacy` / `cutover` / `shadow`
 * modes, backed by the same response-diff primitive `@chrysalis/verify`
 * uses. Session bridging and canary sampling are Milestone 2.
 */

export { startChimera, type ChimeraHandle, type ChimeraStats } from "./proxy.js";
export {
  compileRules,
  routeFor,
  type ChimeraConfig,
  type Mode,
  type RouteRule,
  type Target,
  type CompiledRule,
} from "./routing.js";
