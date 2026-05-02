/**
 * V2-M4 emit strategy (DESIGN D252): how the generated server binds routes to handler modules.
 * Does not change WebIR or handler bodies; only the server scaffold.
 */

/** `eager` (default): static `import` of each handler in `server.ts`. `lazy`: `await import()` per route. */
export type ChrysalisEmitRouteRegistration = "eager" | "lazy";

export interface ChrysalisEmitStrategyV1 {
  readonly routeRegistration?: ChrysalisEmitRouteRegistration;
  /**
   * Emit **`src/chrysalis-handler-imports.ts`** re-export barrel; handlers import runtime/db/session
   * surface through it (DESIGN D256). Default **false** (per-handler imports unchanged).
   */
  readonly handlerImportBarrel?: boolean;
  /**
   * Emit **`src/chrysalis-route-paths.ts`** and reference route paths only through
   * **`ChrysalisRoutePaths`** in **`server.ts`** (drift-friendly, V2-M4). Default **false**.
   */
  readonly emitRoutePathConstants?: boolean;
  /**
   * Write **`chrysalis.emit-handler-fingerprints.json`** with per-handler **SHA-256** of emitted
   * handler source (drift / build cache hints, **DESIGN D259**). Default **false**.
   */
  readonly emitHandlerFingerprints?: boolean;
  /**
   * Emit **`src/chrysalis-runtime-facade.ts`** (re-export of **`./runtime.js`**) and route runtime
   * imports through it from handlers and the optional import barrel (**DESIGN D272**). Default **false**.
   */
  readonly runtimeFacadeModule?: boolean;
  /**
   * Emit **`src/chrysalis-runtime-imports.ts`**: aggregated **`export { … } from "./runtime.js"`** (or from
   * **`./chrysalis-runtime-facade.js`** when **`runtimeFacadeModule`** is set) so handlers import lowering
   * helpers through one module instead of repeating the long runtime import block (**DESIGN D281**).
   * Incompatible with **`handlerImportBarrel`** (barrel already centralizes imports). Default **false**.
   */
  readonly emitSharedRuntimeImports?: boolean;
}
