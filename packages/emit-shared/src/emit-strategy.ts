/**
 * V2-M4 emit strategy (DESIGN D252): how the generated server binds routes to handler modules.
 * Does not change WebIR or handler bodies; only the server scaffold.
 */

/** `eager` (default): static `import` of each handler in `server.ts`. `lazy`: `await import()` per route. */
export type ChrysalisEmitRouteRegistration = "eager" | "lazy";

export interface ChrysalisEmitStrategyV1 {
  readonly routeRegistration?: ChrysalisEmitRouteRegistration;
}
