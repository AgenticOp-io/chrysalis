/**
 * Shared route path constant module for Hono / Fastify emit (V2-M4, DESIGN D258).
 */

export interface ChrysalisRoutePathBinding {
  readonly handlerName: string;
  readonly path: string;
}

/** Normalize `:param` segments the same way emit servers register routes. */
export function normalizeEmitRoutePath(path: string): string {
  return path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, ":$1");
}

export function buildChrysalisRoutePathsModuleSource(
  bindings: ReadonlyArray<ChrysalisRoutePathBinding>,
): string {
  const lines = bindings.map(
    (b) =>
      `  ${JSON.stringify(b.handlerName)}: ${JSON.stringify(normalizeEmitRoutePath(b.path))},`,
  );
  return `/**\n * @chrysalis-provenance emit:route-path-constants\n */\nexport const ChrysalisRoutePaths = {\n${lines.join("\n")}\n} as const;\n`;
}
