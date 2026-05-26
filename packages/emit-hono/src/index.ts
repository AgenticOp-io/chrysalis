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
  aggregateEmittedHandlerImports,
  buildChrysalisRoutePathsModuleSource,
  buildChrysalisRuntimeFacadeModuleSource,
  buildChrysalisRuntimeSharedImportsModuleSource,
  buildEmitHandlerFingerprintsJson,
  buildHonoChrysalisHandlerImportsSource,
  chrysalisBodyDedupeExportId,
  clearEmitResumeState,
  computeEmittedHandlerDedupeKey,
  emitHandlerBody,
  formatEmitProvenanceDisplay,
  handlerEffectAnnotationTags,
  honoBarrelValueImportClause,
  honoHttpProfile,
  ident,
  loadEmitResumeCompletedHandlers,
  markEmitResumeHandlerComplete,
  sha256Utf8Hex,
  planHubMiddlewareEmit,
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
  /**
   * When true, skips rewriting handler files already recorded in
   * `<outDir>/.chrysalis-emit-state.json` (crash resume, V2-M2). The state file is
   * removed when a full emit completes; a normal emit (`false`) clears any stale state at start.
   */
  readonly emitResume?: boolean;
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
  const {
    module: m,
    outDir,
    domainTypesByTable,
    schemaReport,
    emitStrategy,
    provenanceRoot,
    emitResume: emitResumeFlag,
  } = input;
  const emitResume = emitResumeFlag === true;
  if (!emitResume) clearEmitResumeState(outDir);
  const resumeSet = emitResume ? loadEmitResumeCompletedHandlers(outDir) : null;
  const routeRegistration = emitStrategy?.routeRegistration ?? "eager";
  const routePathConstants = emitStrategy?.emitRoutePathConstants === true;
  const emitHandlerFingerprints = emitStrategy?.emitHandlerFingerprints === true;
  const runtimeFacadeModule = emitStrategy?.runtimeFacadeModule === true;
  const emitSharedRuntimeImports = emitStrategy?.emitSharedRuntimeImports === true;
  const emitDedupeIdenticalHandlerBodies = emitStrategy?.emitDedupeIdenticalHandlerBodies === true;
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
  if (runtimeFacadeModule) {
    await writeOne("src/chrysalis-runtime-facade.ts", buildChrysalisRuntimeFacadeModuleSource());
  }

  const bindings: RouteBinding[] = [];

  const routeRoots = nodesByDialect(m, "web.request", "route");
  const handlerImportBarrel = emitStrategy?.handlerImportBarrel === true;
  if (emitSharedRuntimeImports && handlerImportBarrel) {
    throw new Error(
      "emit-hono: emitStrategy.emitSharedRuntimeImports cannot be combined with handlerImportBarrel",
    );
  }
  const routeJobs: Array<{
    attrs: { method: string; path: string; pathParams: ReadonlyArray<{ name: string }> };
    baseName: string;
    emitted: EmittedHandler;
    effectTags: ReadonlyArray<string>;
    phpFile: string;
    handlerFile: string;
    handlerRel: string;
  }> = [];

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

    const phpFile = handler.origin.kind === "php" ? handler.origin.file : "unknown";
    for (const h of emitted.holes) {
      allHoles.push({ name: h.name, file: phpFile, line: h.line, reason: h.reason });
    }

    const handlerFile = `src/handlers/${baseName}.ts`;
    const handlerRel = handlerFile.replace(/\\/g, "/");
    routeJobs.push({ attrs, baseName, emitted, effectTags, phpFile, handlerFile, handlerRel });
  }

  if (handlerImportBarrel && routeJobs.length > 0) {
    const agg = aggregateEmittedHandlerImports(routeJobs.map((j) => j.emitted));
    await writeOne(
      "src/chrysalis-handler-imports.ts",
      buildHonoChrysalisHandlerImportsSource(agg, { runtimeFacadeModule }),
    );
  }

  if (emitSharedRuntimeImports && !handlerImportBarrel && routeJobs.length > 0) {
    const agg = aggregateEmittedHandlerImports(routeJobs.map((j) => j.emitted));
    await writeOne(
      "src/chrysalis-runtime-imports.ts",
      buildChrysalisRuntimeSharedImportsModuleSource(
        runtimeFacadeModule ? "./chrysalis-runtime-facade.js" : "./runtime.js",
        agg,
      ),
    );
  }

  const jobRelToDedupeExportId = new Map<string, string>();
  const dedupeModuleWritten = new Set<string>();
  if (emitDedupeIdenticalHandlerBodies && routeJobs.length > 1) {
    const groups = new Map<string, (typeof routeJobs)[number][]>();
    for (const job of routeJobs) {
      const k = computeEmittedHandlerDedupeKey(job.emitted, job.effectTags);
      const list = groups.get(k);
      if (list) list.push(job);
      else groups.set(k, [job]);
    }
    for (const [k, members] of groups) {
      if (members.length < 2) continue;
      const exportId = chrysalisBodyDedupeExportId(k);
      for (const m of members) jobRelToDedupeExportId.set(m.handlerRel, exportId);
    }
    for (const job of routeJobs) {
      const exportId = jobRelToDedupeExportId.get(job.handlerRel);
      if (!exportId || dedupeModuleWritten.has(exportId)) continue;
      dedupeModuleWritten.add(exportId);
      const head = `/**\n * Shared lowered handler body (DESIGN D282). Regenerate with chrysalis emit.\n */\n`;
      const modSrc =
        head +
        handlerFileText(
          exportId,
          job.emitted,
          job.effectTags,
          formatEmitProvenanceDisplay(undefined, "chrysalis:deduped-handler"),
          false,
          runtimeFacadeModule,
          emitSharedRuntimeImports,
        );
      await writeOne(`src/chrysalis-deduped/${exportId}.ts`, modSrc);
    }
  }

  const handlerFingerprintRows: Array<{ name: string; sourceSha256: string }> = [];
  for (const job of routeJobs) {
    const dedupeId = jobRelToDedupeExportId.get(job.handlerRel);
    const handlerSrc = handlerFileText(
      job.baseName,
      job.emitted,
      job.effectTags,
      formatEmitProvenanceDisplay(provenanceRoot, job.phpFile),
      handlerImportBarrel,
      runtimeFacadeModule,
      emitSharedRuntimeImports,
      dedupeId !== undefined ? { thinDelegateToDeduped: dedupeId } : undefined,
    );
    if (emitHandlerFingerprints) {
      handlerFingerprintRows.push({ name: job.baseName, sourceSha256: sha256Utf8Hex(handlerSrc) });
    }
    const skipWrite = resumeSet !== null && resumeSet.has(job.handlerRel);
    if (!skipWrite) {
      await writeOne(job.handlerFile, handlerSrc);
      if (emitResume) markEmitResumeHandlerComplete(outDir, job.handlerRel);
    }

    bindings.push({
      method: job.attrs.method,
      path: job.attrs.path,
      handlerName: job.baseName,
      file: job.handlerFile,
    });
  }

  if (routePathConstants && bindings.length > 0) {
    await writeOne(
      "src/chrysalis-route-paths.ts",
      buildChrysalisRoutePathsModuleSource(
        bindings.map((b) => ({ handlerName: b.handlerName, path: b.path })),
      ),
    );
  }
  const hubMiddleware = planHubMiddlewareEmit(m);
  await writeOne(
    "src/server.ts",
    SERVER_TS(
      mountBlockFor(bindings, routeRegistration, routePathConstants),
      routeRegistration,
      hubMiddleware.hono,
    ),
  );
  await writeOne("src/index.ts", INDEX_TS);
  await writeOne("chrysalis.holes.json", JSON.stringify(allHoles, null, 2));
  if (emitHandlerFingerprints && handlerFingerprintRows.length > 0) {
    await writeOne(
      "chrysalis.emit-handler-fingerprints.json",
      buildEmitHandlerFingerprintsJson({ handlers: handlerFingerprintRows, sourceApp: appName }),
    );
  }

  clearEmitResumeState(outDir);

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
  useImportBarrel: boolean,
  useRuntimeFacade: boolean,
  useSharedRuntimeImports: boolean,
  dedupe?: { readonly thinDelegateToDeduped: string },
): string {
  const thin = dedupe?.thinDelegateToDeduped;
  const dedupeImportLine = thin ? `import { ${thin} } from "../chrysalis-deduped/${thin}.js";\n` : "";
  const fnBody = thin ? `return ${thin}(c);\n` : emitted.body;
  const domainImport =
    emitted.domainTypeImports.length > 0
      ? `import type { ${emitted.domainTypeImports.join(", ")} } from "../domain.js";\n`
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
  const runtimeModule = useSharedRuntimeImports
    ? "../chrysalis-runtime-imports.js"
    : useRuntimeFacade
      ? "../chrysalis-runtime-facade.js"
      : "../runtime.js";

  if (useImportBarrel) {
    return `import type { Context } from "../chrysalis-handler-imports.js";
import {
  ${honoBarrelValueImportClause(emitted)}
} from "../chrysalis-handler-imports.js";
${dedupeImportLine}${domainImport}
/**
 * @chrysalis-provenance ${JSON.stringify(provenanceFile)}
 * @chrysalis-effects ${effectTags.join(", ") || "(none inferred)"}
 * @chrysalis-shape ${emitted.shape}
 * @chrysalis-holes ${emitted.holes.length}
 */
export async function ${name}(c: Context): Promise<Response> {
${indent(fnBody, 2)}
}
`;
  }

  const ctxImport = usesChrysalisTimeOrRandom(emitted)
    ? `import { chrysalisNow, chrysalisRandom } from "../ctx.js";\n`
    : "";
  return `import type { Context } from "hono";
import { getCookie } from "hono/cookie";
${dedupeImportLine}${domainImport}${ctxImport}import { ${dbImportNames} } from "../db.js";
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
${runtimeZod}} from "${runtimeModule}";

/**
 * @chrysalis-provenance ${JSON.stringify(provenanceFile)}
 * @chrysalis-effects ${effectTags.join(", ") || "(none inferred)"}
 * @chrysalis-shape ${emitted.shape}
 * @chrysalis-holes ${emitted.holes.length}
 */
export async function ${name}(c: Context): Promise<Response> {
${indent(fnBody, 2)}
}
`;
}

function honoPathOfBinding(b: RouteBinding): string {
  return b.path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, ":$1");
}

/**
 * Laravel answers GET on POST-only routes with 405 + Allow. Hono would 404
 * without an explicit GET handler; register one per path that lacks GET.
 */
function methodNotAllowedGetStubs(bindings: RouteBinding[], useRoutePaths: boolean): string {
  const pathToMethods = new Map<string, Set<string>>();
  const pathToHandlerName = new Map<string, string>();
  for (const b of bindings) {
    const p = honoPathOfBinding(b);
    let s = pathToMethods.get(p);
    if (!s) {
      s = new Set();
      pathToMethods.set(p, s);
    }
    s.add(b.method.toUpperCase());
    if (!pathToHandlerName.has(p)) pathToHandlerName.set(p, b.handlerName);
  }
  const lines: string[] = [];
  for (const [p, methods] of pathToMethods) {
    if (methods.has("GET") || methods.size === 0) continue;
    const allow = [...methods].sort().join(", ");
    const pathArg = useRoutePaths
      ? `ChrysalisRoutePaths[${JSON.stringify(pathToHandlerName.get(p)!)}]`
      : JSON.stringify(p);
    lines.push(
      `  app.get(${pathArg}, (_c) => new Response(null, { status: 405, headers: { Allow: ${JSON.stringify(allow)} } }));`,
    );
  }
  return lines.join("\n");
}

function mountBlockFor(
  bindings: RouteBinding[],
  routeRegistration: "eager" | "lazy",
  useRoutePaths: boolean,
): string {
  const stubs = methodNotAllowedGetStubs(bindings, useRoutePaths);
  if (routeRegistration === "lazy") {
    const blocks = bindings
      .map((b) => {
        const method = b.method.toLowerCase();
        const honoPath = honoPathOfBinding(b);
        const rel = `./handlers/${b.handlerName}.js`;
        const pathArg = useRoutePaths
          ? `ChrysalisRoutePaths[${JSON.stringify(b.handlerName)}]`
          : JSON.stringify(honoPath);
        return `  {\n    const m = await import(${JSON.stringify(rel)});\n    app.${method}(${pathArg}, m.${b.handlerName});\n  }`;
      })
      .join("\n");
    const head = useRoutePaths
      ? `import { ChrysalisRoutePaths } from "./chrysalis-route-paths.js";\n\n`
      : "";
    return `${head}async function registerRoutes(app: import("hono").Hono): Promise<void> {
${blocks}
${stubs}
}`;
  }
  const pathImport = useRoutePaths
    ? `import { ChrysalisRoutePaths } from "./chrysalis-route-paths.js";\n`
    : "";
  const imports = bindings
    .map((b) => `import { ${b.handlerName} } from "./handlers/${b.handlerName}.js";`)
    .join("\n");

  const registrations = bindings
    .map((b) => {
      const method = b.method.toLowerCase();
      const honoPath = honoPathOfBinding(b);
      const pathArg = useRoutePaths
        ? `ChrysalisRoutePaths[${JSON.stringify(b.handlerName)}]`
        : JSON.stringify(honoPath);
      return `  app.${method}(${pathArg}, ${b.handlerName});`;
    })
    .join("\n");

  return `${pathImport}${imports}

function registerRoutes(app: import("hono").Hono): void {
${registrations}
${stubs}
}`;
}

function indent(s: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return s
    .split("\n")
    .map((l) => (l.length ? pad + l : l))
    .join("\n");
}
