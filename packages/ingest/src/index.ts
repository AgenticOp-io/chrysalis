/**
 * @chrysalis/ingest — PHP frontend. AST JSON → WebIR Module.
 */

import { resolve } from "node:path";
import {
  fingerprintIngestRouteList,
  recordIngestRouteProgress,
  routeKeyForIngestProgress,
} from "./ingest-progress.js";
import { parseFile, type Provider } from "@chrysalis/parser-bridge";
import { loadOrParsePhpAstWithCache } from "./parse-cache.js";
import { ModuleBuilder, dedupeStructuralSubgraphsInModule, moduleBuilderResumeFromModule, type Module } from "@chrysalis/webir";
import { ingestHandler } from "./convert.js";
import { readIngestCheckpointEnvelope, writeIngestCheckpointEnvelope } from "./ingest-checkpoint.js";
import { buildCallEffectMap } from "./library-effects.js";
import { filterRoutesForShard } from "./route-shard.js";
import {
  dbFactoryReturnCalleeSet,
  loadRouteManifest,
  type RouteManifest,
  type RouteSpec,
} from "./routes.js";

async function sourceAppFromProjectRoot(projectRoot: string): Promise<string> {
  if (projectRoot === "") return "single-file";
  try {
    return (await loadRouteManifest(projectRoot)).app;
  } catch {
    return "single-file";
  }
}

export interface IngestOptions {
  readonly include?: ReadonlyArray<string>;
  readonly exclude?: ReadonlyArray<string>;
  readonly holePolicy?: "liberal" | "strict";
  /** Parser bridge provider; default is parser-bridge's default (`glayzzle`). */
  readonly parserProvider?: Provider;
  /**
   * When set with {@link shardCount} (>= 2), only manifest routes whose
   * {@link RouteSpec.file} falls in this shard are lowered. Call-map widening
   * still uses the full route list.
   */
  readonly shardIndex?: number;
  /** Ingest shard count (>= 2). Omit both shard fields to ingest all routes. */
  readonly shardCount?: number;
  /**
   * When set, reuse cached PHP AST JSON keyed by source SHA-256 + parser provider +
   * {@link INGEST_AST_CACHE_VERSION} (V2-M2). Omit for a cold run.
   */
  readonly ingestCacheDir?: string;
  /**
   * When set, append per-route completion keys to this JSON file after each successful
   * route root (crash-forensics / operator diagnostics only; does not skip ingest work).
   */
  readonly ingestProgressFile?: string;
  /**
   * When true, run {@link dedupeStructuralSubgraphsInModule} on the finished module
   * (same structural key as cross-shard merge; **DESIGN D283**). Default: omit / false.
   */
  readonly dedupeStructuralSubgraphs?: boolean;
  /**
   * When true with {@link dedupeStructuralSubgraphs}, use an origin-insensitive structural
   * key so helpers lowered from different PHP files can still collapse (**ROADMAP** helper-lifting slice).
   */
  readonly dedupeStructuralSubgraphsIgnoreOrigin?: boolean;
  /**
   * When set, atomically writes a versioned ingest checkpoint envelope after each route
   * (partial WebIR + completed route keys). Use with {@link ingestResumeFromCheckpoint} to skip
   * already-completed routes after a crash.
   */
  readonly ingestCheckpointFile?: string;
  /** When true, load {@link ingestCheckpointFile} and skip routes listed in the envelope. */
  readonly ingestResumeFromCheckpoint?: boolean;
}

/** Options for {@link ingestFile} parity with {@link ingestDirectory} call widening. */
export interface IngestFileOptions {
  /**
   * Project root containing `lib/` and `chrysalis.routes.json`. When set,
   * {@link buildCallEffectMap} runs with this route spec so handler effects
   * include `lib/` and same-file hoisted functions (same as directory ingest).
   */
  readonly projectRoot?: string;
  /** Parser bridge provider; default is parser-bridge's default (`glayzzle`). */
  readonly parserProvider?: Provider;
}

function shardFilterEqual(
  a: { readonly shardIndex: number; readonly shardCount: number } | undefined,
  b: { readonly shardIndex: number; readonly shardCount: number } | undefined,
): boolean {
  if (a === undefined && b === undefined) return true;
  if (a === undefined || b === undefined) return false;
  return a.shardIndex === b.shardIndex && a.shardCount === b.shardCount;
}

export async function ingestDirectory(
  root: string,
  opts?: IngestOptions,
): Promise<Module> {
  const manifest = await loadRouteManifest(root);
  const dbFactoryReturns = dbFactoryReturnCalleeSet(manifest);
  const callEffects = await buildCallEffectMap(root, manifest.routes, {
    ...(opts?.parserProvider ? { parserProvider: opts.parserProvider } : {}),
  });
  let routes = manifest.routes;
  if (opts?.shardCount !== undefined) {
    const idx = opts.shardIndex ?? 0;
    routes = filterRoutesForShard(manifest.routes, idx, opts.shardCount);
    if (routes.length === 0) {
      throw new Error(
        `ingestDirectory: no routes matched shard filter (shardIndex=${idx}, shardCount=${opts.shardCount}; manifest has ${manifest.routes.length} route(s))`,
      );
    }
  } else if (opts?.shardIndex !== undefined) {
    throw new Error("ingestDirectory: shardIndex requires shardCount (>= 2)");
  }
  const cacheDir = opts?.ingestCacheDir !== undefined ? resolve(opts.ingestCacheDir) : undefined;
  const provider = opts?.parserProvider;
  const progressPath =
    opts?.ingestProgressFile !== undefined ? resolve(opts.ingestProgressFile) : undefined;
  const checkpointPath =
    opts?.ingestCheckpointFile !== undefined ? resolve(opts.ingestCheckpointFile) : undefined;
  if (opts?.ingestResumeFromCheckpoint === true && checkpointPath === undefined) {
    throw new Error("ingestDirectory: ingestResumeFromCheckpoint requires ingestCheckpointFile");
  }
  if (opts?.dedupeStructuralSubgraphsIgnoreOrigin === true && opts?.dedupeStructuralSubgraphs !== true) {
    throw new Error(
      "ingestDirectory: dedupeStructuralSubgraphsIgnoreOrigin requires dedupeStructuralSubgraphs",
    );
  }
  const routeFingerprint = fingerprintIngestRouteList(routes);
  const projectRootAbs = resolve(root);
  const shardFilter =
    opts?.shardCount !== undefined
      ? { shardIndex: opts.shardIndex ?? 0, shardCount: opts.shardCount }
      : undefined;

  let builder: ModuleBuilder;
  const completedKeys: string[] = [];

  if (opts?.ingestResumeFromCheckpoint === true && checkpointPath !== undefined) {
    const ck = readIngestCheckpointEnvelope(checkpointPath);
    if (!ck.ok) {
      throw new Error(ck.error);
    }
    if (ck.value.manifestRouteFingerprint !== routeFingerprint) {
      throw new Error(
        "ingestDirectory: checkpoint manifestRouteFingerprint does not match current route set (manifest or shard filter changed)",
      );
    }
    if (!shardFilterEqual(ck.value.shardFilter, shardFilter)) {
      throw new Error("ingestDirectory: checkpoint shardFilter does not match current ingest shard options");
    }
    completedKeys.push(...ck.value.completedRouteKeys);
    builder = moduleBuilderResumeFromModule(ck.value.module);
  } else {
    builder = new ModuleBuilder({ sourceApp: manifest.app });
  }

  const completedSet = new Set(completedKeys);

  for (const route of routes) {
    const rk = routeKeyForIngestProgress(route);
    if (completedSet.has(rk)) {
      continue;
    }
    const abs = resolve(root, route.file);
    const ast =
      cacheDir !== undefined
        ? await loadOrParsePhpAstWithCache(abs, provider ?? "glayzzle", cacheDir)
        : await parseFile(abs, {
            ...(provider ? { provider } : {}),
          });
    const routeNode = ingestHandler(builder, ast, route, callEffects, dbFactoryReturns);
    builder.addRoot(routeNode);
    completedSet.add(rk);
    completedKeys.push(rk);
    if (checkpointPath !== undefined) {
      writeIngestCheckpointEnvelope(checkpointPath, {
        routes,
        ...(shardFilter !== undefined ? { shardFilter } : {}),
        completedRouteKeys: completedKeys,
        module: builder.finish(),
      });
    }
    if (progressPath !== undefined) {
      recordIngestRouteProgress({
        progressFilePath: progressPath,
        projectRoot: projectRootAbs,
        sourceApp: manifest.app,
        manifestRouteFingerprint: routeFingerprint,
        routeKey: rk,
        ...(shardFilter !== undefined ? { shardFilter } : {}),
      });
    }
  }
  let mod = builder.finish();
  if (opts?.dedupeStructuralSubgraphs === true) {
    mod = dedupeStructuralSubgraphsInModule(mod, {
      ...(opts.dedupeStructuralSubgraphsIgnoreOrigin === true ? { ignoreOrigin: true as const } : {}),
    });
  }
  return mod;
}

export async function ingestFile(
  phpPath: string,
  route: RouteSpec,
  opts?: IngestFileOptions,
): Promise<Module> {
  const ast = await parseFile(phpPath, {
    ...(opts?.parserProvider ? { provider: opts.parserProvider } : {}),
  });
  const root = opts?.projectRoot ? resolve(opts.projectRoot) : "";
  const callEffects =
    root !== ""
      ? await buildCallEffectMap(root, [route], {
          ...(opts?.parserProvider ? { parserProvider: opts.parserProvider } : {}),
        })
      : new Map();
  let dbFactoryReturns: ReadonlySet<string> = new Set();
  if (root !== "") {
    try {
      dbFactoryReturns = dbFactoryReturnCalleeSet(await loadRouteManifest(root));
    } catch {
      /* single-file / no manifest */
    }
  }
  const builder = new ModuleBuilder({ sourceApp: await sourceAppFromProjectRoot(root) });
  const routeNode = ingestHandler(builder, ast, route, callEffects, dbFactoryReturns);
  builder.addRoot(routeNode);
  return builder.finish();
}

export { INGEST_AST_CACHE_VERSION } from "./parse-cache.js";
export {
  INGEST_PROGRESS_KIND,
  INGEST_PROGRESS_SCHEMA_VERSION,
  fingerprintIngestRouteList,
  parseIngestProgressJson,
  readIngestProgressFile,
  recordIngestRouteProgress,
  routeKeyForIngestProgress,
  type IngestProgressStateV0,
  type ParseIngestProgressResult,
} from "./ingest-progress.js";
export {
  INGEST_CHECKPOINT_ENVELOPE_KIND,
  INGEST_CHECKPOINT_ENVELOPE_SCHEMA_VERSION,
  readIngestCheckpointEnvelope,
  stableRouteFingerprintMatches,
  writeIngestCheckpointEnvelope,
  type IngestCheckpointEnvelopeV1,
  type ReadIngestCheckpointResult,
} from "./ingest-checkpoint.js";
export { filterRoutesForShard, routeFileShardBucket } from "./route-shard.js";
export { buildCallEffectMap, buildLibraryCallEffectMap } from "./library-effects.js";
export { dbFactoryReturnCalleeSet, loadRouteManifest, normalizeDbFactoryCalleeLabel } from "./routes.js";
export type { RouteManifest, RouteSpec };
