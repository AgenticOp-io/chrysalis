/** Lowered lib helper module emission (G2318). */
import type { Module } from "@chrysalis/webir";
import { emitLibHelperFunctionBody, type EmitHandlerOptions } from "./emit-tree.js";
import { ident } from "./ts-util.js";
import { resolveHelperBodyEntry } from "./lib-helper-inline.js";

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
  let usesPasswordVerify = false;

  for (const exportName of helperNames) {
    const entry = resolveHelperBodyEntry(bodies, exportName);
    if (entry === undefined) continue;
    const emitted = emitLibHelperFunctionBody(m, entry.bodyId, entry.paramNames, opts);
    for (const t of emitted.domainTypeImports) domainTypeImports.add(t);
    if (emitted.usesDb) usesDb = true;
    if (/\bpasswordVerify\b/.test(emitted.body)) usesPasswordVerify = true;
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
  const runtimeImport = usesPasswordVerify ? `import { passwordVerify } from "./runtime.js";\n` : "";
  const source = `${domainImport}${dbImport}${runtimeImport}\n${fnLines.join("\n")}`;
  return {
    source,
    helperNames,
    domainTypeImports: [...domainTypeImports].sort(),
    usesDb,
    holes: allHoles,
  };
}
