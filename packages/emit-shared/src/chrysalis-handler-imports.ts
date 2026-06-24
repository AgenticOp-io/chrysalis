/**
 * Optional **`src/chrysalis-handler-imports.ts`** barrel for emitted handlers (V2-M4 follow-up, DESIGN D256).
 * Reduces duplicated static import lines across handler modules without changing WebIR.
 */

import type { EmittedHandler } from "./emit-tree.js";

export interface AggregatedHandlerImportNeeds {
  readonly usesQueryAllWhereIn: boolean;
  readonly usesChrysalisTimeOrRandom: boolean;
  readonly usesChrysalisBatchHelpers: boolean;
  readonly usesZod: boolean;
  readonly usesPhpFqnNew: boolean;
  readonly usesPhpDynamicNew: boolean;
  readonly usesWpCall: boolean;
}

export function aggregateEmittedHandlerImports(
  handlers: ReadonlyArray<EmittedHandler>,
): AggregatedHandlerImportNeeds {
  return {
    usesQueryAllWhereIn: handlers.some((h) => h.usesQueryAllWhereIn),
    usesChrysalisTimeOrRandom: handlers.some(
      (h) => h.effectNames.includes("time.now") || h.effectNames.includes("random"),
    ),
    usesChrysalisBatchHelpers: handlers.some((h) => h.usesChrysalisBatchHelpers),
    usesZod: handlers.some((h) => h.usesZod),
    usesPhpFqnNew: handlers.some((h) => h.usesPhpFqnNew),
    usesPhpDynamicNew: handlers.some((h) => h.usesPhpDynamicNew),
    usesWpCall: handlers.some((h) => h.usesWpCall),
  };
}

/** Symbols re-exported from **`runtime.js`** (or facade) for barrels and **`chrysalis-runtime-imports.ts`**. */
export function runtimeExportNamesForAgg(agg: AggregatedHandlerImportNeeds): string[] {
  const lines: string[] = [
    "escapeHtml",
    "renderCwlUiTree",
    "nl2br",
    "urlencode",
    "rawurlencode",
    "urldecode",
    "rawurldecode",
    "ltrim",
    "rtrim",
    "currentUser",
    "requireLogin",
    "isset",
    "empty",
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
  ];
  if (agg.usesChrysalisBatchHelpers) {
    lines.push("chrysalisPluck", "chrysalisRowByColumn");
  }
  lines.push(
    "microtimeString",
    "pregMatch",
    "parseUrlComponent",
    "parseUrlParts",
    "passwordVerify",
    "__hole",
  );
  if (agg.usesWpCall) lines.push("wpCall");
  if (agg.usesPhpFqnNew) lines.push("phpFqnNew");
  if (agg.usesPhpDynamicNew) lines.push("phpDynamicNew");
  lines.push("__respond");
  if (agg.usesZod) {
    lines.push("parseZodBodyFieldRaw", "parseZodEnumBodyFieldRaw");
  }
  return lines;
}

export interface BuildChrysalisHandlerImportsOptions {
  /** When true, runtime re-exports use **`./chrysalis-runtime-facade.js`** (DESIGN D272). */
  readonly runtimeFacadeModule?: boolean;
}

/** Hono: shared barrel at **`src/chrysalis-handler-imports.ts`**. */
export function buildHonoChrysalisHandlerImportsSource(
  agg: AggregatedHandlerImportNeeds,
  options?: BuildChrysalisHandlerImportsOptions,
): string {
  const db = agg.usesQueryAllWhereIn
    ? "queryAll, queryAllWhereIn, queryOne, execSql, db"
    : "queryAll, queryOne, execSql, db";
  const rt = runtimeExportNamesForAgg(agg);
  const runtimeFrom =
    options?.runtimeFacadeModule === true ? "./chrysalis-runtime-facade.js" : "./runtime.js";
  const parts: string[] = [
    `export type { Context } from "hono";`,
    `export { getCookie } from "hono/cookie";`,
    `export { ${db} } from "./db.js";`,
    `export { getSession } from "./session.js";`,
  ];
  if (agg.usesChrysalisTimeOrRandom) {
    parts.push(`export { chrysalisNow, chrysalisRandom } from "./ctx.js";`);
  }
  parts.push(`export {\n  ${rt.join(",\n  ")},\n} from "${runtimeFrom}";\n`);
  return parts.join("\n");
}

/** Fastify: shared barrel at **`src/chrysalis-handler-imports.ts`**. */
export function buildFastifyChrysalisHandlerImportsSource(
  agg: AggregatedHandlerImportNeeds,
  options?: BuildChrysalisHandlerImportsOptions,
): string {
  const db = agg.usesQueryAllWhereIn
    ? "queryAll, queryAllWhereIn, queryOne, execSql, db"
    : "queryAll, queryOne, execSql, db";
  const rt = runtimeExportNamesForAgg(agg);
  const runtimeFrom =
    options?.runtimeFacadeModule === true ? "./chrysalis-runtime-facade.js" : "./runtime.js";
  const parts: string[] = [
    `export type { FastifyReply, FastifyRequest } from "fastify";`,
    `export { ${db} } from "./db.js";`,
    `export { getSession } from "./session.js";`,
  ];
  if (agg.usesChrysalisTimeOrRandom) {
    parts.push(`export { chrysalisNow, chrysalisRandom } from "./ctx.js";`);
  }
  parts.push(`export {\n  ${rt.join(",\n  ")},\n} from "${runtimeFrom}";\n`);
  return parts.join("\n");
}

export function usesChrysalisTimeOrRandomHandler(emitted: EmittedHandler): boolean {
  return emitted.effectNames.includes("time.now") || emitted.effectNames.includes("random");
}

/** Runtime value imports for one handler (excluding Hono/Fastify surface types). */
export function honoBarrelValueImportClause(emitted: EmittedHandler): string {
  const ctxPart = usesChrysalisTimeOrRandomHandler(emitted)
    ? "chrysalisNow, chrysalisRandom, "
    : "";
  const dbImportNames = emitted.usesQueryAllWhereIn
    ? "queryAll, queryAllWhereIn, queryOne, execSql, db"
    : "queryAll, queryOne, execSql, db";
  const runtimeBatch = emitted.usesChrysalisBatchHelpers
    ? "chrysalisPluck,\n  chrysalisRowByColumn,\n"
    : "";
  const runtimeZod = emitted.usesZod ? "parseZodBodyFieldRaw,\n  parseZodEnumBodyFieldRaw,\n" : "";
  const runtimeFqn = emitted.usesPhpFqnNew ? "phpFqnNew,\n" : "";
  const runtimeDynamicNew = emitted.usesPhpDynamicNew ? "phpDynamicNew,\n" : "";
  const runtimeWpCall = emitted.usesWpCall ? "  wpCall,\n" : "";
  return `getCookie, ${ctxPart}${dbImportNames}, getSession, 
  escapeHtml,
  renderCwlUiTree,
  nl2br,
  currentUser,
  requireLogin,
  isset,
  empty,
  trim,
  intval,
  strlen,
${runtimeBatch}  microtimeString,
  pregMatch,
  parseUrlComponent,
  parseUrlParts,
  passwordVerify,
  __hole,
${runtimeWpCall}${runtimeFqn}${runtimeDynamicNew}  __respond,
${runtimeZod}`;
}

/**
 * Source for **`src/chrysalis-runtime-imports.ts`** when **`emitStrategy.emitSharedRuntimeImports`** is set
 * without **`handlerImportBarrel`** (**DESIGN D281**).
 */
export function buildChrysalisRuntimeSharedImportsModuleSource(
  relativeRuntimeModule: string,
  agg: AggregatedHandlerImportNeeds,
): string {
  const names = runtimeExportNamesForAgg(agg);
  return `/**
 * Aggregated runtime re-exports for emitted handlers (V2-M4, DESIGN D281).
 * Do not edit by hand; regenerate with \`chrysalis emit\`.
 */
export {
  ${names.join(",\n  ")},
} from "${relativeRuntimeModule}";
`;
}

export function fastifyBarrelValueImportClause(emitted: EmittedHandler): string {
  const ctxPart = usesChrysalisTimeOrRandomHandler(emitted)
    ? "chrysalisNow, chrysalisRandom, "
    : "";
  const dbImportNames = emitted.usesQueryAllWhereIn
    ? "queryAll, queryAllWhereIn, queryOne, execSql, db"
    : "queryAll, queryOne, execSql, db";
  const runtimeBatch = emitted.usesChrysalisBatchHelpers
    ? "chrysalisPluck,\n  chrysalisRowByColumn,\n"
    : "";
  const runtimeZod = emitted.usesZod ? "parseZodBodyFieldRaw,\n  parseZodEnumBodyFieldRaw,\n" : "";
  const runtimeFqn = emitted.usesPhpFqnNew ? "phpFqnNew,\n" : "";
  const runtimeDynamicNew = emitted.usesPhpDynamicNew ? "phpDynamicNew,\n" : "";
  const runtimeWpCall = emitted.usesWpCall ? "  wpCall,\n" : "";
  return `${ctxPart}${dbImportNames}, getSession, 
  escapeHtml,
  renderCwlUiTree,
  nl2br,
  currentUser,
  requireLogin,
  isset,
  empty,
  trim,
  intval,
  strlen,
${runtimeBatch}  microtimeString,
  pregMatch,
  parseUrlComponent,
  parseUrlParts,
  passwordVerify,
  __hole,
${runtimeWpCall}${runtimeFqn}${runtimeDynamicNew}  __respond,
${runtimeZod}`;
}
