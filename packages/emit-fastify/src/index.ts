/**
 * @chrysalis/emit-fastify — WebIR → Fastify + SQLite (node:sqlite).
 *
 * Second emit backend; same handler IR lowering as Hono via `@chrysalis/emit-shared`.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { emitDrizzleSchema, type SchemaReport } from "@chrysalis/archaeology";
import {
  emitHandlerBody,
  fastifyHttpProfile,
  handlerEffectAnnotationTags,
  ident,
  type EmittedHandler,
} from "@chrysalis/emit-shared";
import type { Module, NodeBase } from "@chrysalis/webir";
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
  readonly schemaReport?: SchemaReport;
  readonly domainTypesByTable?: Readonly<Record<string, string>>;
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
  readonly effectsByHandler: Record<string, ReadonlyArray<string>>;
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

async function writeFileWithMkdir(path: string, contents: string): Promise<number> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents, "utf8");
  return Buffer.byteLength(contents, "utf8");
}

export async function emit(input: EmitInput): Promise<EmitResult> {
  const { module: m, outDir, domainTypesByTable, schemaReport } = input;
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
  await writeOne("src/runtime.ts", RUNTIME_TS);
  await writeOne("src/session.ts", SESSION_TS);

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
      fastifyHttpProfile,
    );
    const effectTags = handlerEffectAnnotationTags(handler, emitted);
    effectsByHandler[baseName] = effectTags;

    const phpFile = handler.origin.kind === "php" ? handler.origin.file : "unknown";
    for (const h of emitted.holes) {
      allHoles.push({ name: h.name, file: phpFile, line: h.line, reason: h.reason });
    }

    const handlerFile = `src/handlers/${baseName}.ts`;
    await writeOne(handlerFile, handlerFileText(baseName, emitted, effectTags));

    bindings.push({
      method: attrs.method,
      path: attrs.path,
      handlerName: baseName,
      file: handlerFile,
    });
  }

  const { imports, registrations } = mountBlockFor(bindings);
  await writeOne("src/server.ts", SERVER_TS(imports, registrations));
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
): string {
  const domainImport =
    emitted.domainTypeImports.length > 0
      ? `import type { ${emitted.domainTypeImports.join(", ")} } from "../domain.js";\n`
      : "";
  const ctxImport = usesChrysalisTimeOrRandom(emitted)
    ? `import { chrysalisNow, chrysalisRandom } from "../ctx.js";\n`
    : "";
  return `import type { FastifyReply, FastifyRequest } from "fastify";
${domainImport}${ctxImport}import { queryAll, queryOne, execSql, db } from "../db.js";
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
  pregMatch,
  parseUrlComponent,
  passwordVerify,
  __hole,
  __respond,
} from "../runtime.js";

/**
 * @chrysalis-effects ${effectTags.join(", ") || "(none inferred)"}
 * @chrysalis-shape ${emitted.shape}
 * @chrysalis-holes ${emitted.holes.length}
 */
export async function ${name}(req: FastifyRequest, reply: FastifyReply): Promise<FastifyReply | void> {
${indent(emitted.body, 2)}
}
`;
}

function mountBlockFor(bindings: RouteBinding[]): { imports: string; registrations: string } {
  const imports = bindings
    .map((b) => `import { ${b.handlerName} } from "./handlers/${b.handlerName}.js";`)
    .join("\n");
  const registrations = bindings
    .map((b) => {
      const method = b.method.toLowerCase();
      const path = b.path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, ":$1");
      return `  app.${method}(${JSON.stringify(path)}, ${b.handlerName});`;
    })
    .join("\n");
  return { imports, registrations };
}

function indent(s: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return s
    .split("\n")
    .map((l) => (l.length ? pad + l : l))
    .join("\n");
}
