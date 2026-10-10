/** Lowered lib helper module emission (G2318). */
import type { Module } from "@chrysalis/webir";
import { emitLibHelperFunctionBody, type EmitHandlerOptions } from "./emit-tree.js";
import { ident } from "./ts-util.js";
import { resolveHelperBodyEntry } from "./lib-helper-inline.js";

/**
 * Runtime shims that emit-tree may emit as bare callees inside lib-helper bodies.
 * Handlers import these via the barrel; lib-helpers.ts must import them itself
 * (e.g. tiny-blog `current_user` → `empty(...)`).
 */
const LIB_HELPER_RUNTIME_IMPORT_CANDIDATES = [
  "passwordVerify",
  "empty",
  "isset",
  "escapeHtml",
  "nl2br",
  "urlencode",
  "rawurlencode",
  "urldecode",
  "rawurldecode",
  "ltrim",
  "rtrim",
  "trim",
  "intval",
  "strlen",
  "json_encode",
  "json_decode",
  "md5",
  "sha1",
  "base64_encode",
  "base64_decode",
  "bin2hex",
  "preg_quote",
  "basename",
  "dirname",
  "gettype",
  "is_callable",
  "is_resource",
  "ord",
  "chr",
  "hash",
  "sprintf",
  "number_format",
  "implode",
  "pregReplace",
  "pregSplit",
  "hexdec",
  "dechex",
  "strval",
  "filterVar",
  "crc32",
  "count",
  "is_array",
  "is_string",
  "abs",
  "is_numeric",
  "microtimeString",
  "pregMatch",
  "parseUrlComponent",
  "parseUrlParts",
  "__hole",
] as const;

/** Match call sites only (`empty(`), not param names like `verify_password(plain, hash)`. */
const LIB_HELPER_RUNTIME_IMPORT_RES: ReadonlyArray<readonly [string, RegExp]> =
  LIB_HELPER_RUNTIME_IMPORT_CANDIDATES.map(
    (name) => [name, new RegExp(`\\b${name}\\s*\\(`)] as const,
  );

export interface EmittedLibHelpersModule {
  readonly source: string | null;
  readonly helperNames: readonly string[];
  readonly domainTypeImports: readonly string[];
  readonly usesDb: boolean;
  readonly holes: ReadonlyArray<{ name: string; line: number; reason: string }>;
}

export function emitLibHelpersModuleSource(
  m: Module,
  helperNames: readonly string[],
  opts?: EmitHandlerOptions,
): EmittedLibHelpersModule {
  const bodies = m.meta.helperBodies;
  if (!bodies || helperNames.length === 0) {
    return { source: null, helperNames: [], domainTypeImports: [], usesDb: false, holes: [] };
  }
  const fnLines: string[] = [];
  const domainTypeImports = new Set<string>();
  const allHoles: { name: string; line: number; reason: string }[] = [];
  let usesDb = false;
  const runtimeImports = new Set<string>();

  for (const exportName of helperNames) {
    const entry = resolveHelperBodyEntry(bodies, exportName);
    if (entry === undefined) continue;
    const emitted = emitLibHelperFunctionBody(m, entry.bodyId, entry.paramNames, opts);
    for (const t of emitted.domainTypeImports) domainTypeImports.add(t);
    if (emitted.usesDb) usesDb = true;
    for (const [name, re] of LIB_HELPER_RUNTIME_IMPORT_RES) {
      if (re.test(emitted.body)) runtimeImports.add(name);
    }
    allHoles.push(...emitted.holes);
    const params = entry.paramNames.map((p) => ident(p)).join(", ");
    const isAsync = /\bawait\b/.test(emitted.body);
    fnLines.push(`export ${isAsync ? "async " : ""}function ${exportName}(${params}) {`);
    fnLines.push(emitted.body.split("\n").map((l) => (l.length ? `  ${l}` : l)).join("\n"));
    fnLines.push("}");
    fnLines.push("");
  }

  if (fnLines.length === 0) {
    return { source: null, helperNames: [], domainTypeImports: [], usesDb: false, holes: [] };
  }

  const domainImport =
    domainTypeImports.size > 0
      ? `import type { ${[...domainTypeImports].sort().join(", ")} } from "./domain.js";\n`
      : "";
  const dbImport = usesDb ? `import { queryAll, queryOne, execSql } from "./db.js";\n` : "";
  const runtimeNames = [...runtimeImports].sort();
  const runtimeImport =
    runtimeNames.length > 0 ? `import { ${runtimeNames.join(", ")} } from "./runtime.js";\n` : "";
  const source = `${domainImport}${dbImport}${runtimeImport}\n${fnLines.join("\n")}`;
  return {
    source,
    helperNames,
    domainTypeImports: [...domainTypeImports].sort(),
    usesDb,
    holes: allHoles,
  };
}
