/**
 * @chrysalis/parser-bridge — PHP → canonical AST JSON.
 *
 * Provider-pluggable per DESIGN.md D5. The `glayzzle` provider (pure JS) is
 * bundled for developer convenience; `nikic` (PHP subprocess + json_encode AST)
 * is supported when `composer install` has been run in `packages/parser-bridge`.
 */

import { readFile } from "node:fs/promises";
import { parseFileWithGlayzzle, parseSourceWithGlayzzle } from "./providers/glayzzle.js";
import { parseFileWithNikic, parseSourceWithNikic } from "./providers/nikic.js";
import { SCHEMA_VERSION, type PhpAst } from "./schema.js";

export { SCHEMA_VERSION };
export type {
  PhpAst,
  PhpNode,
  PhpExpr,
  Pos,
  PhpAssign,
  PhpIf,
  PhpForeach,
  PhpReturn,
  PhpCall,
  PhpLiteral,
  PhpVariable,
  PhpArrayAccess,
  PhpSuperglobal,
  PhpBinOp,
  PhpUnaryOp,
  PhpCoalesce,
  PhpTernary,
  PhpArray,
  PhpCast,
  PhpConstFetch,
  PhpInlineHtml,
  PhpEcho,
  PhpExpressionStatement,
  PhpRequire,
  PhpFunctionDecl,
  PhpClassDecl,
  PhpClassProperty,
  PhpExit,
  PhpThrow,
  PhpNew,
  PhpNewDynamic,
  PhpAttribute,
  PhpArrowFunction,
  PhpMatch,
  PhpMatchArm,
  PhpNoop,
  PhpNodeUnknown,
  PhpExprUnknown,
} from "./schema.js";

export type Provider = "glayzzle" | "nikic";

export interface ParseOptions {
  readonly provider?: Provider;
}

export async function parseFile(path: string, opts: ParseOptions = {}): Promise<PhpAst> {
  const provider = opts.provider ?? "glayzzle";
  if (provider === "glayzzle") return parseFileWithGlayzzle(path);
  if (provider === "nikic") return parseFileWithNikic(path);
  const src = await readFile(path, "utf8");
  return parseSource(src, path, opts);
}

export async function parseSource(
  src: string,
  filename = "<anon.php>",
  opts: ParseOptions = {},
): Promise<PhpAst> {
  const provider = opts.provider ?? "glayzzle";
  if (provider === "glayzzle") return parseSourceWithGlayzzle(src, filename);
  if (provider === "nikic") return parseSourceWithNikic(src, filename);
  throw new Error(`parser-bridge: unknown provider '${String(provider)}'`);
}
