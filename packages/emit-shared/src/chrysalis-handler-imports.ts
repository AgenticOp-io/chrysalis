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
  };
}

function runtimeExportNames(agg: AggregatedHandlerImportNeeds): string[] {
  const lines: string[] = [
    "escapeHtml",
    "nl2br",
    "currentUser",
    "requireLogin",
    "isset",
    "empty",
    "trim",
    "intval",
    "strlen",
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
  if (agg.usesPhpFqnNew) lines.push("phpFqnNew");
  if (agg.usesPhpDynamicNew) lines.push("phpDynamicNew");
  lines.push("__respond");
  if (agg.usesZod) {
    lines.push("parseZodBodyFieldRaw", "parseZodEnumBodyFieldRaw");
  }
  return lines;
}

/** Hono: shared barrel at **`src/chrysalis-handler-imports.ts`**. */
export function buildHonoChrysalisHandlerImportsSource(agg: AggregatedHandlerImportNeeds): string {
  const db = agg.usesQueryAllWhereIn
    ? "queryAll, queryAllWhereIn, queryOne, execSql, db"
    : "queryAll, queryOne, execSql, db";
  const rt = runtimeExportNames(agg);
  const parts: string[] = [
    `export type { Context } from "hono";`,
    `export { getCookie } from "hono/cookie";`,
    `export { ${db} } from "./db.js";`,
    `export { getSession } from "./session.js";`,
  ];
  if (agg.usesChrysalisTimeOrRandom) {
    parts.push(`export { chrysalisNow, chrysalisRandom } from "./ctx.js";`);
  }
  parts.push(`export {\n  ${rt.join(",\n  ")},\n} from "./runtime.js";\n`);
  return parts.join("\n");
}

/** Fastify: shared barrel at **`src/chrysalis-handler-imports.ts`**. */
export function buildFastifyChrysalisHandlerImportsSource(agg: AggregatedHandlerImportNeeds): string {
  const db = agg.usesQueryAllWhereIn
    ? "queryAll, queryAllWhereIn, queryOne, execSql, db"
    : "queryAll, queryOne, execSql, db";
  const rt = runtimeExportNames(agg);
  const parts: string[] = [
    `export type { FastifyReply, FastifyRequest } from "fastify";`,
    `export { ${db} } from "./db.js";`,
    `export { getSession } from "./session.js";`,
  ];
  if (agg.usesChrysalisTimeOrRandom) {
    parts.push(`export { chrysalisNow, chrysalisRandom } from "./ctx.js";`);
  }
  parts.push(`export {\n  ${rt.join(",\n  ")},\n} from "./runtime.js";\n`);
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
  return `getCookie, ${ctxPart}${dbImportNames}, getSession, 
  escapeHtml,
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
${runtimeFqn}${runtimeDynamicNew}  __respond,
${runtimeZod}`;
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
  return `${ctxPart}${dbImportNames}, getSession, 
  escapeHtml,
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
${runtimeFqn}${runtimeDynamicNew}  __respond,
${runtimeZod}`;
}
