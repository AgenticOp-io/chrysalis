/**
 * @chrysalis/emit-hono — WebIR → Hono + SQLite project emitter.
 *
 * Produces a compiling TypeScript project that mirrors the original PHP
 * app's routes, using Hono for HTTP, better-sqlite3 for the DB, and a small
 * in-memory session store. This is the Milestone 1 reference backend.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Module, NodeBase, NodeId } from "@chrysalis/webir";
import { emitHandlerBody, type EmittedHandler } from "./emit-tree.js";
import {
  DB_TS,
  INDEX_TS,
  PACKAGE_JSON,
  RUNTIME_TS,
  SESSION_TS,
  TSCONFIG_JSON,
} from "./runtime-files.js";
import { ident } from "./ts-util.js";

export interface EmitInput {
  readonly module: Module;
  readonly outDir: string;
  readonly dbDialect?: "sqlite" | "postgres" | "mysql";
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
  const { module: m, outDir } = input;
  const appName = m.meta.sourceApp || "chrysalis-app";
  const files: EmittedFile[] = [];
  const allHoles: HoleRecord[] = [];
  const effectsByHandler: Record<string, ReadonlyArray<string>> = {};

  const writeOne = async (relPath: string, contents: string): Promise<void> => {
    const full = join(outDir, relPath);
    const len = await writeFileWithMkdir(full, contents);
    files.push({ path: relPath, contentsLength: len });
  };

  await writeOne("package.json", PACKAGE_JSON(appName));
  await writeOne("tsconfig.json", TSCONFIG_JSON);
  await writeOne("src/db.ts", DB_TS);
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

    const emitted = emitHandlerBody(m, handlerId);
    effectsByHandler[baseName] = emitted.effectNames;

    // Scope holes to this handler for the registry.
    const phpFile = handler.origin.kind === "php" ? handler.origin.file : "unknown";
    for (const h of emitted.holes) {
      allHoles.push({ name: h.name, file: phpFile, line: h.line, reason: h.reason });
    }

    const handlerFile = `src/handlers/${baseName}.ts`;
    await writeOne(handlerFile, handlerFileText(baseName, emitted));

    bindings.push({
      method: attrs.method,
      path: attrs.path,
      handlerName: baseName,
      file: handlerFile,
    });
  }

  await writeOne("src/index.ts", INDEX_TS(mountBlockFor(bindings)));
  await writeOne("chrysalis.holes.json", JSON.stringify(allHoles, null, 2));

  return {
    files,
    holes: allHoles,
    handlerCount: bindings.length,
    effectsByHandler,
  };
}

function handlerFileText(name: string, emitted: EmittedHandler): string {
  return `import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import { queryAll, queryOne, execSql, db } from "../db.js";
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
  passwordVerify,
  __hole,
  __respond,
} from "../runtime.js";

/**
 * @chrysalis-effects ${emitted.effectNames.join(", ") || "(none inferred)"}
 * @chrysalis-shape ${emitted.shape}
 * @chrysalis-holes ${emitted.holes.length}
 */
export async function ${name}(c: Context): Promise<Response> {
${indent(emitted.body, 2)}
}
`;
}

function mountBlockFor(bindings: RouteBinding[]): string {
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
