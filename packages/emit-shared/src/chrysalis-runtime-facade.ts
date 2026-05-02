/**
 * Optional **`src/chrysalis-runtime-facade.ts`** for emitted apps (V2-M4 shared chunk v0, DESIGN D272).
 * Single import surface for PHP lowering shims so operators can swap or wrap **`runtime.ts`** later.
 */

export function buildChrysalisRuntimeFacadeModuleSource(): string {
  return `/**
 * Thin re-export of PHP runtime lowering shims (V2-M4 shared chunk v0, DESIGN D272).
 * When enabled via \`emitStrategy.runtimeFacadeModule\`, handlers and the optional import
 * barrel import runtime symbols through this module instead of \`./runtime.js\` directly.
 */
export * from "./runtime.js";
`;
}
