/**
 * Dispatch hub file lift to the best available ingest path per language.
 */
import { canJavaScriptAstIngest, liftJavaScriptFileToWebir } from "./javascript-ast-ingest.mjs";
import { canPythonAstIngest, liftPythonFileToWebir } from "./python-ast-ingest.mjs";
import { canJavaAstIngest, liftJavaFileToWebir } from "./java-ast-ingest.mjs";
import { canGoAstIngest, liftGoFileToWebir } from "./go-ast-ingest.mjs";
import { canPatternRouteLift, liftPatternRoutesFile } from "./pattern-route-lift.mjs";
import { canCwlIngest, liftCwlFileToWebir } from "./cwl-ingest.mjs";

/**
 * @param {object} opts — webir, builder, wr, source, file, language, ext
 * @returns {{ routeCount: number, astRouteCount: number, usedAst: boolean } | null}
 */
export function trySpecializedHubLift(opts) {
  const lifters = [
    { can: canCwlIngest, lift: liftCwlFileToWebir },
    { can: canJavaScriptAstIngest, lift: liftJavaScriptFileToWebir },
    { can: canPythonAstIngest, lift: liftPythonFileToWebir },
    { can: canJavaAstIngest, lift: liftJavaFileToWebir },
    { can: canGoAstIngest, lift: liftGoFileToWebir },
    {
      can: (lang) => canPatternRouteLift(lang),
      lift: (o) => liftPatternRoutesFile(o),
    },
  ];

  for (const { can, lift } of lifters) {
    if (!can(opts.language, opts.ext)) continue;
    const r = lift(opts);
    if (r.usedAst && (r.routeCount > 0 || (r.middlewareRootCount ?? 0) > 0)) return r;
  }
  return null;
}
