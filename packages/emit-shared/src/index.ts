/**
 * Shared emission logic for Chrysalis HTTP backends.
 */

export { honoHttpProfile, fastifyHttpProfile, type HttpEmitProfile, type HttpEmitFrameworkId } from "./http-profile.js";
export { isAuthBoundaryCallee } from "@chrysalis/webir";
export {
  emitHandlerBody,
  emitExpr,
  emitStmt,
  handlerEffectAnnotationTags,
  type EmittedHandler,
  type EmitHandlerOptions,
} from "./emit-tree.js";
export { ident, stringLit, jsonLit, indent } from "./ts-util.js";
export { planHubMiddlewareEmit, type HubMiddlewareEmitPlan } from "./hub-middleware-emit.js";
export {
  summarizeEmittedTypeScriptLayout,
  type EmittedTsLayout,
} from "./emitted-ts-layout.js";
export type {
  ChrysalisEmitRouteRegistration,
  ChrysalisEmitStrategyV1,
} from "./emit-strategy.js";
export { formatEmitProvenanceDisplay } from "./emit-provenance.js";
export {
  clearEmitResumeState,
  EMIT_RESUME_STATE_BASENAME,
  loadEmitResumeCompletedHandlers,
  markEmitResumeHandlerComplete,
  type EmitResumeStateV1,
} from "./emit-resume-state.js";
export {
  aggregateEmittedHandlerImports,
  buildChrysalisRuntimeSharedImportsModuleSource,
  buildFastifyChrysalisHandlerImportsSource,
  buildHonoChrysalisHandlerImportsSource,
  fastifyBarrelValueImportClause,
  honoBarrelValueImportClause,
  type AggregatedHandlerImportNeeds,
  type BuildChrysalisHandlerImportsOptions,
} from "./chrysalis-handler-imports.js";
export { buildChrysalisRuntimeFacadeModuleSource } from "./chrysalis-runtime-facade.js";
export {
  buildChrysalisRoutePathsModuleSource,
  normalizeEmitRoutePath,
  type ChrysalisRoutePathBinding,
} from "./chrysalis-route-paths.js";
export {
  EMIT_HANDLER_FINGERPRINTS_KIND,
  EMIT_HANDLER_FINGERPRINTS_SCHEMA_VERSION,
  buildEmitHandlerFingerprintsJson,
  sha256Utf8Hex,
} from "./emit-handler-fingerprints.js";
export {
  chrysalisBodyDedupeExportId,
  computeEmittedHandlerDedupeKey,
} from "./emit-handler-body-dedupe.js";
