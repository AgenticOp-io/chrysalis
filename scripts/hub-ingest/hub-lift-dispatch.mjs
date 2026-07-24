/**
 * Dispatch hub file lift to the best available ingest path per language.
 */
import { canJavaScriptAstIngest, liftJavaScriptFileToWebir } from "./javascript-ast-ingest.mjs";
import { canPythonAstIngest, liftPythonFileToWebir } from "./python-ast-ingest.mjs";
import { canJavaAstIngest, liftJavaFileToWebir } from "./java-ast-ingest.mjs";
import { canGoAstIngest, liftGoFileToWebir } from "./go-ast-ingest.mjs";
import { canCsharpAstIngest, liftCsharpFileToWebir } from "./csharp-ast-ingest.mjs";
import { canRubyAstIngest, liftRubyFileToWebir } from "./ruby-ast-ingest.mjs";
import { canKotlinAstIngest, liftKotlinFileToWebir } from "./kotlin-ast-ingest.mjs";
import { canScalaAstIngest, liftScalaFileToWebir } from "./scala-ast-ingest.mjs";
import { canSwiftAstIngest, liftSwiftFileToWebir } from "./swift-ast-ingest.mjs";
import { canRustAstIngest, liftRustFileToWebir } from "./rust-ast-ingest.mjs";
import { canElixirAstIngest, liftElixirFileToWebir } from "./elixir-ast-ingest.mjs";
import { canDartAstIngest, liftDartFileToWebir } from "./dart-ast-ingest.mjs";
import { canCppAstIngest, liftCppFileToWebir } from "./cpp-ast-ingest.mjs";
import { canPhpAstIngest, liftPhpFileToWebir } from "./php-ast-ingest.mjs";
import { canPatternRouteLift, liftPatternRoutesFile } from "./pattern-route-lift.mjs";
import { extractVueScript } from "./pattern-route-parsers.mjs";
import { canCwlIngest, liftCwlFileToWebir } from "./cwl-ingest.mjs";

/**
 * @param {string} language
 * @param {string} ext
 */
function canVueScriptAstIngest(language, ext) {
  return language === "vue" || ext.toLowerCase() === ".vue";
}

/**
 * @param {object} opts
 */
function liftVueFileToWebir(opts) {
  const script = extractVueScript(opts.source);
  if (!script.trim()) {
    return { usedAst: false, routeCount: 0, astRouteCount: 0 };
  }
  const jsFile = opts.file.replace(/\.vue$/i, ".js");
  return liftJavaScriptFileToWebir({ ...opts, source: script, file: jsFile });
}

/**
 * @param {object} opts — webir, builder, wr, source, file, language, ext
 * @returns {{ routeCount: number, astRouteCount: number, usedAst: boolean } | null}
 */
export function trySpecializedHubLift(opts) {
  const lifters = [
    { can: canCwlIngest, lift: liftCwlFileToWebir },
    { can: canJavaScriptAstIngest, lift: liftJavaScriptFileToWebir },
    { can: canVueScriptAstIngest, lift: liftVueFileToWebir },
    { can: canPythonAstIngest, lift: liftPythonFileToWebir },
    { can: canJavaAstIngest, lift: liftJavaFileToWebir },
    { can: canGoAstIngest, lift: liftGoFileToWebir },
    { can: canRubyAstIngest, lift: liftRubyFileToWebir },
    { can: canCsharpAstIngest, lift: liftCsharpFileToWebir },
    // Prefer kotlin-ast (Spring fun / mapOf / ResponseEntity) over thin pattern lift.
    { can: canKotlinAstIngest, lift: liftKotlinFileToWebir },
    // Prefer scala-ast (Akka complete / Map / StatusCodes) over thin pattern lift.
    { can: canScalaAstIngest, lift: liftScalaFileToWebir },
    // Prefer swift-ast (Vapor dict / encodeResponse status) over thin pattern lift.
    { can: canSwiftAstIngest, lift: liftSwiftFileToWebir },
    // Prefer rust-ast (Actix macros / HttpResponse+json / path-query) over thin pattern lift.
    { can: canRustAstIngest, lift: liftRustFileToWebir },
    // Prefer elixir-ast (Plug.Router do…end / Jason.encode! / send_resp) over thin pattern lift.
    { can: canElixirAstIngest, lift: liftElixirFileToWebir },
    // Prefer dart-ast (Shelf router.get|post / Response.ok|status / jsonEncode) over thin pattern lift.
    { can: canDartAstIngest, lift: liftDartFileToWebir },
    // Prefer cpp-ast (Crow / cpp-httplib verbs + JSON/status/path-query) over silver file-lift.
    { can: canCppAstIngest, lift: liftCppFileToWebir },
    // Slim secondary (G10028): $app->get|post closures — not packages/ingest Laravel/Symfony/plain.
    { can: canPhpAstIngest, lift: liftPhpFileToWebir },
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
