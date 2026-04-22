/**
 * @chrysalis/runtime-chimera — dual-stack runtime: traffic router,
 * session bridge, schema lens.
 */

export type RouteMode = "legacy" | "shadow" | "canary" | "cutover" | "done";

export interface RouteRule {
  readonly match: { readonly method?: string; readonly path: string };
  readonly mode: RouteMode;
  readonly canaryPercent?: number;
  readonly cohortHashSeed?: string;
}

export interface ChimeraConfig {
  readonly legacyUpstream: string;
  readonly newUpstream: string;
  readonly rules: ReadonlyArray<RouteRule>;
  readonly sessionStore: { readonly kind: "redis"; readonly url: string } | { readonly kind: "sqlite"; readonly path: string };
}

export interface Chimera {
  start(port: number): Promise<void>;
  stop(): Promise<void>;
}

export async function createChimera(_config: ChimeraConfig): Promise<Chimera> {
  throw new Error("runtime-chimera: createChimera not implemented (Milestone 1).");
}
