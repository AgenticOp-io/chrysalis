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
import {
  ModuleBuilder,
  dedupeStructuralSubgraphsInModule,
  mergeWebIrModules,
  moduleBuilderResumeFromModule,
  type Module,
  type NodeId,
} from "@chrysalis/webir";
import { buildLibraryHelpersWebIrModule, collectLibraryFunctionAttributes, collectLibraryFunctionBodies } from "./library-effects.js";
import { ingestHandler } from "./convert.js";
import { readIngestCheckpointEnvelope, writeIngestCheckpointEnvelope } from "./ingest-checkpoint.js";
import { buildCallEffectMap } from "./library-effects.js";
import { filterRoutesForShard } from "./route-shard.js";
import {
  dbFactoryReturnCalleeSet,
  loadRouteManifest,
  wordpressEffectCalleeSet,
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
   * When true with {@link dedupeStructuralSubgraphs}, canonicalize structurally identical
   * lib/vendor helper bodies for call-effect widening (**IR helper lifting B2**).
   */
  readonly liftSharedHelpers?: boolean;
  /**
   * When true with {@link liftSharedHelpers}, also merge helpers that differ only by
   * PHP local variable names (**IR helper lifting B3**).
   */
  readonly liftSharedHelpersSemantic?: boolean;
  /**
   * When true with {@link liftSharedHelpers}, allow helper-lift structural keys to ignore
   * origin metadata (default). Set false to require identical origin when lifting.
   */
  readonly liftSharedHelpersIgnoreOrigin?: boolean;
  /**
   * When true with {@link dedupeStructuralSubgraphs}, merge lib/vendor helper bodies as
   * extra module roots before structural dedupe (**IR helper lifting B4**).
   */
  readonly embedSharedHelperBodiesInModule?: boolean;
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
  const wordpressEffects = wordpressEffectCalleeSet(manifest);
  const callEffects = await buildCallEffectMap(root, manifest.routes, {
    ...(opts?.parserProvider ? { parserProvider: opts.parserProvider } : {}),
    ...(opts?.liftSharedHelpers === true ? { liftSharedHelpers: true as const } : {}),
    ...(opts?.liftSharedHelpersSemantic === true ? { liftSharedHelpersSemantic: true as const } : {}),
    ...(opts?.liftSharedHelpersIgnoreOrigin === false
      ? { liftSharedHelpersIgnoreOrigin: false as const }
      : {}),
  });
  const libFunctionAttributes = await collectLibraryFunctionAttributes(root, manifest.routes, {
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
  if (opts?.liftSharedHelpers === true && opts?.dedupeStructuralSubgraphs !== true) {
    throw new Error("ingestDirectory: liftSharedHelpers requires dedupeStructuralSubgraphs");
  }
  if (opts?.liftSharedHelpersSemantic === true && opts?.liftSharedHelpers !== true) {
    throw new Error("ingestDirectory: liftSharedHelpersSemantic requires liftSharedHelpers");
  }
  if (opts?.liftSharedHelpersIgnoreOrigin === false && opts?.liftSharedHelpers !== true) {
    throw new Error("ingestDirectory: liftSharedHelpersIgnoreOrigin false requires liftSharedHelpers");
  }
  if (opts?.embedSharedHelperBodiesInModule === true && opts?.dedupeStructuralSubgraphs !== true) {
    throw new Error(
      "ingestDirectory: embedSharedHelperBodiesInModule requires dedupeStructuralSubgraphs",
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

  const helperBodies = await collectLibraryFunctionBodies(root, builder, manifest.routes, {
    ...(opts?.parserProvider ? { parserProvider: opts.parserProvider } : {}),
  });

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
    const routeNode = ingestHandler(
      builder,
      ast,
      route,
      callEffects,
      dbFactoryReturns,
      libFunctionAttributes,
      helperBodies,
      wordpressEffects,
    );
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
  if (helperBodies.size > 0) {
    const helperBodiesMeta: Record<string, { bodyId: NodeId; paramNames: readonly string[] }> = {};
    for (const [name, entry] of helperBodies) {
      helperBodiesMeta[name] = { bodyId: entry.bodyId, paramNames: entry.paramNames };
    }
    mod = { ...mod, meta: { ...mod.meta, helperBodies: helperBodiesMeta } };
  }
  if (opts?.embedSharedHelperBodiesInModule === true) {
    const helperMod = await buildLibraryHelpersWebIrModule(root, manifest.app, {
      ...(opts?.parserProvider ? { parserProvider: opts.parserProvider } : {}),
    });
    if (helperMod !== null) {
      mod = mergeWebIrModules([mod, helperMod]);
    }
  }
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
  const libFunctionAttributes =
    root !== ""
      ? await collectLibraryFunctionAttributes(root, [route], {
          ...(opts?.parserProvider ? { parserProvider: opts.parserProvider } : {}),
        })
      : new Map();
  let dbFactoryReturns: ReadonlySet<string> = new Set();
  let wordpressEffects: ReadonlySet<string> = new Set();
  if (root !== "") {
    try {
      const manifest = await loadRouteManifest(root);
      dbFactoryReturns = dbFactoryReturnCalleeSet(manifest);
      wordpressEffects = wordpressEffectCalleeSet(manifest);
    } catch {
      /* single-file / no manifest */
    }
  }
  const builder = new ModuleBuilder({ sourceApp: await sourceAppFromProjectRoot(root) });
  const helperBodies =
    root !== ""
      ? await collectLibraryFunctionBodies(root, builder, [route], {
          ...(opts?.parserProvider ? { parserProvider: opts.parserProvider } : {}),
        })
      : new Map<string, import("./convert.js").HelperBodyEntry>();
  const routeNode = ingestHandler(
    builder,
    ast,
    route,
    callEffects,
    dbFactoryReturns,
    libFunctionAttributes,
    helperBodies,
    wordpressEffects,
  );
  builder.addRoot(routeNode);
  let mod = builder.finish();
  if (helperBodies.size > 0) {
    const helperBodiesMeta: Record<string, { bodyId: NodeId; paramNames: readonly string[] }> = {};
    for (const [name, entry] of helperBodies) {
      helperBodiesMeta[name] = { bodyId: entry.bodyId, paramNames: entry.paramNames };
    }
    mod = { ...mod, meta: { ...mod.meta, helperBodies: helperBodiesMeta } };
  }
  return mod;
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
export {
  buildCallEffectMap,
  buildLibraryCallEffectMap,
  buildLibraryHelpersWebIrModule,
  collectLibraryFunctionAttributes,
  collectLibraryFunctionBodies,
} from "./library-effects.js";
export {
  applyHelperLiftAliases,
  buildHelperLiftAliasMap,
  buildHelperLiftLocalSlotMap,
  functionBodyStructuralKey,
  normalizeSqlLiteralForHelperLift,
} from "./lift-shared-helpers.js";
export {
  collectFunctionAttributes,
  type HelperBodyEntry,
  type PhpAttributeMeta,
} from "./convert.js";
export { dbFactoryReturnCalleeSet, loadRouteManifest, normalizeDbFactoryCalleeLabel, wordpressEffectCalleeSet } from "./routes.js";
export type { RouteManifest, RouteSpec };
export {
  canPythonHubIngest,
  canPythonAstIngest,
  ingestPythonHubSource,
  liftPythonFileToWebir,
  liftPythonRoutesToWebir,
  parsePythonFile,
  parsePythonRoutes,
  PYTHON_BRIDGE_SCHEMA_VERSION,
  type LiftPythonHubOpts,
  type LiftPythonHubResult,
  type PythonHubParseResult,
  type PythonHubRoute,
} from "./hub-python.js";
export {
  descopeSvelteSelector,
  liftUiAssets,
  svelteKitCssAdapter,
  svelteKitRoutePatternSource,
  uiRouteBundleSlug,
  writeUiAssetLiftArtifacts,
  UI_FRAMEWORK_CSS_ADAPTERS,
  type LiftUiAssetsOptions,
  type LiftUiAssetsResult,
  type SuccessfulLiftUiAssetsResult,
  type UiAssetLiftHole,
  type UiFrameworkCssAdapter,
  type UiRouteStyleSources,
  type WriteUiAssetLiftArtifactsOptions,
  type WriteUiAssetLiftArtifactsResult,
} from "./ui-assets.js";
export {
  cleanupDescopedSelector,
  descopeVueSelector,
  viteVueCssAdapter,
  viteVueManifestKeyToRouteId,
} from "./ui-assets-vue.js";
export {
  descopeCssModuleSelector,
  viteCssModulesAdapter,
  viteJsManifestKeyToRouteId,
} from "./ui-assets-css-modules.js";
export {
  angularComponentManifestKeyToRouteId,
  angularCssAdapter,
  descopeAngularSelector,
  resolveAngularBrowserRoot,
} from "./ui-assets-angular.js";
export {
  discoverUiAssetBuildRoot,
  liftProjectUiAssets,
  type LiftProjectUiAssetsOptions,
  type LiftProjectUiAssetsResult,
} from "./ui-assets-discover.js";
export {
  extractHtmlClassNames,
  liftStaticSveltePageHtml,
  svelteKitMarkupAdapter,
  svelteKitPageFileToRouteId,
} from "./ui-markup-svelte.js";
export {
  DEFAULT_LAYOUT_PASSTHROUGH_COMPONENTS,
  DEFAULT_SHOWCASE_LOAD_BOOLS,
  DEFAULT_STATIC_INLINE_COMPONENTS,
  DEFAULT_MODAL_SHELL_COMPONENTS,
  DEFAULT_MAP_SHELL_COMPONENTS,
  DEFAULT_CHART_SHELL_COMPONENTS,
  DEFAULT_NAV_SHELL_COMPONENTS,
  DEFAULT_WIZARD_SHELL_COMPONENTS,
  DEFAULT_WIDGET_SHELL_COMPONENTS,
  HOLE_COMPONENT,
  HOLE_EACH,
  HOLE_IF,
  HOLE_INTERP,
  findNextSvelteBlock,
  indexSvelteComponentSources,
  liftStructuralSveltePageHtml,
  stripSvelteNonMarkup,
  type LiftStructuralSvelteOptions,
  type SvelteMarkupLiftHole,
  type SvelteMarkupLiftMode,
  type SvelteMarkupLiftResult,
} from "./ui-markup-svelte-structural.js";
export {
  angularMarkupAdapter,
  angularTemplateFileToRouteId,
  liftStaticAngularTemplateHtml,
} from "./ui-markup-angular.js";
export {
  liftStaticVueTemplateHtml,
  viteVueMarkupAdapter,
  vueSourceFileToRouteId,
} from "./ui-markup-vue.js";
export { finalizeStaticMarkup, isStaticHtmlFragment } from "./ui-markup-static.js";
export {
  liftUiMarkup,
  writeUiMarkupLiftArtifacts,
  UI_FRAMEWORK_MARKUP_ADAPTERS,
  type LiftUiMarkupOptions,
  type LiftUiMarkupResult,
  type SuccessfulLiftUiMarkupResult,
  type UiFrameworkMarkupAdapter,
  type UiMarkupLiftHole,
  type UiMarkupLiftModeOption,
  type UiMarkupPageLiftDetail,
  type WriteUiMarkupLiftArtifactsOptions,
  type WriteUiMarkupLiftArtifactsResult,
} from "./ui-markup.js";
export {
  discoverUiMarkupProjectRoot,
  liftProjectUiMarkup,
  type LiftProjectUiMarkupOptions,
  type LiftProjectUiMarkupResult,
} from "./ui-markup-discover.js";
export {
  convertSiteProjectUi,
  defaultSiteConvertCwlPaths,
  summarizeSiteConvertReport,
  writeSiteConvertReport,
  SITE_CONVERT_REPORT_KIND,
  SITE_CONVERT_REPORT_SCHEMA_VERSION,
  type ConvertSiteProjectOptions,
  type ConvertSiteProjectResult,
  type CwlMarkupPatchResult,
} from "./site-convert.js";
export {
  bindSiteProjectLoadFromTraces,
  bindTracedLoadToCwlSource,
  hydrateDemoHtmlFromApiBody,
  hydrateStructuralHtmlFromApiBody,
  parseCwlLoadScalars,
  parseEachHeader,
  resolveInterpDetail,
  evaluateIfDetail,
  resolveJsonPath,
  mergeShowcaseHydrateBody,
  DEFAULT_SHOWCASE_HYDRATE_CONSTANTS,
  WIDGET_SHELL_COLLECTION_KEYS,
  indexTracedApiResponses,
  resolveRouteApiPath,
  seedApiPathsIntoCwlSource,
  SITE_LOAD_BIND_REPORT_KIND,
  SITE_LOAD_BIND_REPORT_SCHEMA_VERSION,
  tracedApiLoadFields,
  type BindSiteProjectLoadOptions,
  type BindSiteProjectLoadResult,
  type BindTracedLoadToCwlOptions,
  type BindTracedLoadToCwlResult,
  type SeedApiPathsIntoCwlOptions,
  type SeedApiPathsIntoCwlResult,
  type SiteLoadBindRouteResult,
  type TraceApiBinding,
} from "./site-load-bind.js";
export { inferUiPageApiPath } from "./infer-ui-page-api-path.js";
export {
  parseCsharpRoutes,
  parseGoRoutes,
  parseJavaRoutes,
  parseRubyRoutes,
  HUB_NATIVE_BRIDGE_SCHEMA_VERSION,
  type HubNativeParseResult,
  type HubNativeRoute,
} from "./hub-native.js";
