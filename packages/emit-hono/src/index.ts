/**
 * @chrysalis/emit-hono — WebIR → Hono + SQLite project emitter.
 *
 * Produces a compiling TypeScript project that mirrors the original PHP
 * app's routes, using Hono for HTTP, `node:sqlite` for sync DB access, and a
 * small session store. When `schemaReport` is passed, also emits
 * `src/schema.ts` (Drizzle sqlite-core) plus a `drizzle-orm` dependency for
 * tooling and future query-builder reads; handlers still use `queryOne` /
 * `queryAll` over prepares (portable, matches SQL replay tapes).
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { emitDrizzleSchema, type SchemaReport } from "@chrysalis/archaeology";
import type { Module, NodeBase, NodeId } from "@chrysalis/webir";
import {
  emitHandlerBody,
  formatEmitProvenanceDisplay,
  handlerEffectAnnotationTags,
  honoHttpProfile,
  ident,
  type ChrysalisEmitStrategyV1,
  type EmittedHandler,
} from "@chrysalis/emit-shared";
import {
  CTX_TS,
  DB_TS,
  INDEX_TS,
  PACKAGE_JSON,
  RUNTIME_TS,
  SERVER_TS,
  SESSION_TS,
  TSCONFIG_JSON,
} from "./runtime-files.js";

export interface EmitInput {
  readonly module: Module;
  readonly outDir: string;
  readonly dbDialect?: "sqlite" | "postgres" | "mysql";
  /**
   * When set, emits `src/schema.ts` and adds `drizzle-orm` to package.json.
   * Should accompany `domainTypesByTable` from the same `runArchaeology` report.
   */
  readonly schemaReport?: SchemaReport;
  /**
   * When set, single-table `db.query` nodes emit `queryOne<T>` / `queryAll<T>`
   * with `T` from archaeology `domain.ts`. Keys must be lowercase table names
   * (same normalization as ingest `guessTables`).
   */
  readonly domainTypesByTable?: Readonly<Record<string, string>>;
  /** Optional V2-M4 scaffold strategy (default: eager static imports). */
  readonly emitStrategy?: ChrysalisEmitStrategyV1;
  /** When set, `@chrysalis-provenance` prefers paths relative to this directory (posix). */
  readonly provenanceRoot?: string;
}

export interface EmittedFile {
  readonly path: string;
  readonly contentsLength: number;
}

export interface HoleRecord {
  readonly name: string;
  readonly file: string;
  readonly line: number;
  readonly reason: string;
}

export interface EmitResult {
  readonly files: ReadonlyArray<EmittedFile>;
  readonly holes: ReadonlyArray<HoleRecord>;
  readonly handlerCount: number;
  readonly effectsByHandler: Readonly<Record<string, ReadonlyArray<string>>>;
}

interface RouteBinding {
  readonly method: string;
  readonly path: string;
  readonly handlerName: string;
  readonly file: string;
}

function nodesByDialect(m: Module, dialect: string, op: string): NodeBase[] {
  const out: NodeBase[] = [];
  for (const [, n] of m.nodes) {
    if (n.dialect === dialect && n.op === op) out.push(n);
  }
  return out;
}

function nodesById(m: Module, ids: ReadonlyArray<NodeId>): NodeBase[] {
  return ids.map((i) => {
    const n = m.nodes.get(i);
    if (!n) throw new Error(`emit-hono: missing node ${String(i)}`);
    return n;
  });
}

async function writeFileWithMkdir(path: string, contents: string): Promise<number> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents, "utf8");
  return Buffer.byteLength(contents, "utf8");
}

export async function emit(input: EmitInput): Promise<EmitResult> {
  const { module: m, outDir, domainTypesByTable, schemaReport, emitStrategy, provenanceRoot } = input;
  const routeRegistration = emitStrategy?.routeRegistration ?? "eager";
  const appName = m.meta.sourceApp || "chrysalis-app";
  const useDrizzle = schemaReport !== undefined;
  const files: EmittedFile[] = [];
  const allHoles: HoleRecord[] = [];
  const effectsByHandler: Record<string, ReadonlyArray<string>> = {};

  const writeOne = async (relPath: string, contents: string): Promise<void> => {
    const full = join(outDir, relPath);
    const len = await writeFileWithMkdir(full, contents);
    files.push({ path: relPath, contentsLength: len });
  };

  await writeOne("package.json", PACKAGE_JSON(appName, { drizzle: useDrizzle }));
  await writeOne("tsconfig.json", TSCONFIG_JSON);
  if (useDrizzle) {
    await writeOne("src/schema.ts", emitDrizzleSchema(schemaReport));
  }
  await writeOne("src/db.ts", DB_TS);
  await writeOne("src/ctx.ts", CTX_TS);
  await writeOne("src/session.ts", SESSION_TS);
  await writeOne("src/runtime.ts", RUNTIME_TS);

  const bindings: RouteBinding[] = [];

  const routeRoots = nodesByDialect(m, "web.request", "route");
  for (const routeNode of routeRoots) {
    const attrs = routeNode.attrs as {
      method: string;
      path: string;
      pathParams: ReadonlyArray<{ name: string }>;
    };
    const handlerId = routeNode.operands[0]!;
    const handler = m.nodes.get(handlerId)!;
    const baseName = ident(String((handler.attrs as { name?: string }).name ?? "handler"));

    const emitted = emitHandlerBody(
      m,
      handlerId,
      domainTypesByTable ? { domainTypesByTable } : undefined,
      honoHttpProfile,
    );
    const effectTags = handlerEffectAnnotationTags(handler, emitted);
    effectsByHandler[baseName] = effectTags;

    // Scope holes to this handler for the registry.
    const phpFile = handler.origin.kind === "php" ? handler.origin.file : "unknown";
    for (const h of emitted.holes) {
      allHoles.push({ name: h.name, file: phpFile, line: h.line, reason: h.reason });
    }

    const handlerFile = `src/handlers/${baseName}.ts`;
    await writeOne(
      handlerFile,
      handlerFileText(baseName, emitted, effectTags, formatEmitProvenanceDisplay(provenanceRoot, phpFile)),
    );

    bindings.push({
      method: attrs.method,
      path: attrs.path,
      handlerName: baseName,
      file: handlerFile,
    });
  }

  await writeOne("src/server.ts", SERVER_TS(mountBlockFor(bindings, routeRegistration), routeRegistration));
  await writeOne("src/index.ts", INDEX_TS);
  await writeOne("chrysalis.holes.json", JSON.stringify(allHoles, null, 2));

  return {
    files,
    holes: allHoles,
    handlerCount: bindings.length,
    effectsByHandler,
  };
}

function usesChrysalisTimeOrRandom(emitted: EmittedHandler): boolean {
  return emitted.effectNames.includes("time.now") || emitted.effectNames.includes("random");
}

function handlerFileText(
  name: string,
  emitted: EmittedHandler,
  effectTags: ReadonlyArray<string>,
  provenanceFile: string,
): string {
  const domainImport =
    emitted.domainTypeImports.length > 0
      ? `import type { ${emitted.domainTypeImports.join(", ")} } from "../domain.js";\n`
      : "";
  const ctxImport = usesChrysalisTimeOrRandom(emitted)
    ? `import { chrysalisNow, chrysalisRandom } from "../ctx.js";\n`
    : "";
  const dbImportNames = emitted.usesQueryAllWhereIn
    ? "queryAll, queryAllWhereIn, queryOne, execSql, db"
    : "queryAll, queryOne, execSql, db";
  const runtimeBatch = emitted.usesChrysalisBatchHelpers
    ? "  chrysalisPluck,\n  chrysalisRowByColumn,\n"
    : "";
  const runtimeZod = emitted.usesZod
    ? "  parseZodBodyFieldRaw,\n  parseZodEnumBodyFieldRaw,\n"
    : "";
  const runtimeFqn = emitted.usesPhpFqnNew ? "  phpFqnNew,\n" : "";
  const runtimeDynamicNew = emitted.usesPhpDynamicNew ? "  phpDynamicNew,\n" : "";
  return `import type { Context } from "hono";
import { getCookie } from "hono/cookie";
${domainImport}${ctxImport}import { ${dbImportNames} } from "../db.js";
import { getSession } from "../session.js";
import {
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
${runtimeZod}} from "../runtime.js";

/**
 * @chrysalis-provenance ${JSON.stringify(provenanceFile)}
 * @chrysalis-effects ${effectTags.join(", ") || "(none inferred)"}
 * @chrysalis-shape ${emitted.shape}
 * @chrysalis-holes ${emitted.holes.length}
 */
export async function ${name}(c: Context): Promise<Response> {
${indent(emitted.body, 2)}
}
`;
}

function mountBlockFor(bindings: RouteBinding[], routeRegistration: "eager" | "lazy"): string {
  if (routeRegistration === "lazy") {
    const blocks = bindings
      .map((b) => {
        const method = b.method.toLowerCase();
        const honoPath = b.path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, ":$1");
        const rel = `./handlers/${b.handlerName}.js`;
        return `  {\n    const m = await import(${JSON.stringify(rel)});\n    app.${method}(${JSON.stringify(honoPath)}, m.${b.handlerName});\n  }`;
      })
      .join("\n");
    return `async function registerRoutes(app: import("hono").Hono): Promise<void> {
${blocks}
}`;
  }
  const imports = bindings
    .map((b) => `import { ${b.handlerName} } from "./handlers/${b.handlerName}.js";`)
    .join("\n");

  const registrations = bindings
    .map((b) => {
      const method = b.method.toLowerCase();
      const honoPath = b.path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, ":$1");
      return `  app.${method}(${JSON.stringify(honoPath)}, ${b.handlerName});`;
    })
    .join("\n");

  return `${imports}

function registerRoutes(app: import("hono").Hono): void {
${registrations}
}`;
}

function indent(s: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return s
    .split("\n")
    .map((l) => (l.length ? pad + l : l))
    .join("\n");
}
