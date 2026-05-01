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
}
