/**
 * Shared emission logic for Chrysalis HTTP backends.
 */

export { honoHttpProfile, fastifyHttpProfile, type HttpEmitProfile, type HttpEmitFrameworkId } from "./http-profile.js";
export {
  emitHandlerBody,
  emitExpr,
  emitStmt,
  handlerEffectAnnotationTags,
  isAuthBoundaryCallee,
  type EmittedHandler,
  type EmitHandlerOptions,
} from "./emit-tree.js";
export { ident, stringLit, jsonLit, indent } from "./ts-util.js";
