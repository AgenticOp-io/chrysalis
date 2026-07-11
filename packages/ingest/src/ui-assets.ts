/**
 * UI asset lift (DESIGN D6365, G9300b): per-route scoped-CSS conversion.
 *
 * Rules (normative, see the decision log entry):
 * 1. Never de-scope into one global sheet — one bundle per source route.
 * 2. The route→stylesheet map comes from the source build manifest.
 * 3. De-scoping is a per-framework adapter with a common contract.
 * 4. `url()` assets are recorded and rewritten, never dropped silently.
 * 5. Unsupported scoping schemes hole as `legacy:css-scoping-<scheme>`.
 */
import { existsSync, cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import postcss from "postcss";
import type { Provenance, UiLiftedAssetRef, UiRouteStyleMapV1, UiStylesheetBundle } from "@chrysalis/webir";
import { UI_ROUTE_STYLE_MAP_KIND, UI_ROUTE_STYLE_MAP_SCHEMA_VERSION } from "@chrysalis/webir";
import { viteVueCssAdapter } from "./ui-assets-vue.js";
import { viteCssModulesAdapter } from "./ui-assets-css-modules.js";
import { angularCssAdapter } from "./ui-assets-angular.js";
import { uiRouteBundleSlug, uiRoutePatternSource } from "./ui-route-patterns.js";

/** One source route with the stylesheets its page loads (layouts first). */
export interface UiRouteStyleSources {
  /** Framework route id, e.g. `"/login"` or `"/portal/[tenantId]"`. */
  readonly routeId: string;
  /** Build-relative stylesheet paths, layout sheets before leaf sheets. */
  readonly stylesheets: ReadonlyArray<string>;
}

/**
 * The per-framework contract. An adapter knows two things about its source
 * framework: how the build manifest maps routes to stylesheets, and what the
 * scoping tokens look like so they can be stripped without breaking selectors.
 */
export interface UiFrameworkCssAdapter {
  /** Adapter name, recorded in the emitted map (e.g. `"sveltekit"`). */
  readonly name: string;
  /** True when `buildRoot` looks like this framework's build output. */
  detect(buildRoot: string): boolean;
  /**
   * Read the build manifest: every page route plus the stylesheets it loads,
   * and the root-layout sheets used as the fallback bundle.
   */
  routeStyleSources(buildRoot: string): {
    readonly routes: ReadonlyArray<UiRouteStyleSources>;
    readonly fallbackStylesheets: ReadonlyArray<string>;
  };
  /** Resolve a manifest stylesheet path to an absolute file path. */
  resolveStylesheet(buildRoot: string, stylesheet: string): string;
  /**
   * De-scope one selector. Return the cleaned selector, or null when it
   * cannot survive the strip (was only the scope class, or a bare pseudo /
   * dangling combinator remains — keeping those would style the whole page).
   */
  descopeSelector(selector: string): string | null;
  /** Framework route id → anchored pathname regex source. */
  routePatternSource(routeId: string): string;
}

/* -------------------------------------------------------------------------- */
/* SvelteKit adapter                                                           */
/* -------------------------------------------------------------------------- */

const SVELTE_HASH = /\.svelte-[a-z0-9]+/g;

/** De-scope a Svelte 4/5 scoped selector (exported for direct reuse/tests). */
export function descopeSvelteSelector(selector: string): string | null {
  if (!SVELTE_HASH.test(selector)) return selector;
  SVELTE_HASH.lastIndex = 0;
  let stripped = selector.replace(SVELTE_HASH, "");
  // Svelte 5 scopes via functional pseudos: "h1:where(.svelte-x)" leaves
  // "h1:where()" after the strip — invalid CSS that browsers discard.
  stripped = stripped
    .replace(/,\s*,/g, ",")
    .replace(/\(\s*,\s*/g, "(")
    .replace(/,\s*\)/g, ")")
    .replace(/:(?:where|is|not|has)\(\s*\)/g, "");
  const parts = stripped.split(/(\s+|\s*[>+~]\s*)/);
  for (const part of parts) {
    const p = part.trim();
    if (p === "" || /^[>+~]$/.test(p)) continue;
    // A compound reduced to a bare pseudo (".svelte-x:hover" -> ":hover")
    // would match the entire document; drop the selector instead.
    if (/^::?[a-zA-Z-]/.test(p)) return null;
  }
  const cleaned = stripped.replace(/\s{2,}/g, " ").trim();
  if (cleaned.length === 0) return null;
  if (/^[>+~]/.test(cleaned) || /[>+~]$/.test(cleaned)) return null;
  return cleaned;
}

/** SvelteKit route id → anchored pathname regex source (`[param]` → `[^/]+`). */
export function svelteKitRoutePatternSource(routeId: string): string {
  return uiRoutePatternSource(routeId);
}

interface SvelteKitRouteNode {
  readonly id: string;
  readonly layouts: ReadonlyArray<number>;
  readonly leaf: number;
}

function parseSvelteKitManifest(serverDir: string): SvelteKitRouteNode[] {
  const text = readFileSync(join(serverDir, "manifest-full.js"), "utf8");
  const routes: SvelteKitRouteNode[] = [];
  const re =
    /id:\s*"([^"]*)"[\s\S]*?(?:page:\s*\{\s*layouts:\s*\[([\d,\s]*)\],\s*errors:\s*\[[\d,\s]*\],\s*leaf:\s*(\d+)\s*\}|endpoint:\s*null)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m[2] === undefined || m[3] === undefined) continue;
    const layouts = m[2]
      .split(",")
      .map((x) => x.trim())
      .filter((x) => x.length > 0)
      .map(Number);
    routes.push({ id: m[1] ?? "", layouts, leaf: Number(m[3]) });
  }
  return routes;
}

function svelteKitNodeStylesheets(serverDir: string, node: number): string[] {
  const p = join(serverDir, "nodes", `${node}.js`);
  if (!existsSync(p)) return [];
  const m = /export const stylesheets = (\[[^\]]*\]);/.exec(readFileSync(p, "utf8"));
  if (m === null || m[1] === undefined) return [];
  try {
    const parsed: unknown = JSON.parse(m[1]);
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

/**
 * SvelteKit adapter. `buildRoot` is the app root; the manifest lives in
 * `.svelte-kit/output/server` and stylesheets in `.svelte-kit/output/client`
 * (preferred — survives `build/` restaging) or `build/client`.
 */
export const svelteKitCssAdapter: UiFrameworkCssAdapter = {
  name: "sveltekit",
  detect(buildRoot) {
    return existsSync(join(buildRoot, ".svelte-kit/output/server/manifest-full.js"));
  },
  routeStyleSources(buildRoot) {
    const serverDir = join(buildRoot, ".svelte-kit/output/server");
    const nodes = parseSvelteKitManifest(serverDir);
    const routes: UiRouteStyleSources[] = [];
    for (const node of nodes) {
      const sheets: string[] = [];
      for (const layout of node.layouts) {
        for (const s of svelteKitNodeStylesheets(serverDir, layout)) {
          if (!sheets.includes(s)) sheets.push(s);
        }
      }
      for (const s of svelteKitNodeStylesheets(serverDir, node.leaf)) {
        if (!sheets.includes(s)) sheets.push(s);
      }
      if (sheets.length > 0) routes.push({ routeId: node.id, stylesheets: sheets });
    }
    return { routes, fallbackStylesheets: svelteKitNodeStylesheets(serverDir, 0) };
  },
  resolveStylesheet(buildRoot, stylesheet) {
    const outputClient = join(buildRoot, ".svelte-kit/output/client", stylesheet);
    if (existsSync(outputClient)) return outputClient;
    return join(buildRoot, "build/client", stylesheet);
  },
  descopeSelector: descopeSvelteSelector,
  routePatternSource: svelteKitRoutePatternSource,
};

/** Adapter registry; unsupported frameworks hole (rule 5), never best-guess. */
export const UI_FRAMEWORK_CSS_ADAPTERS: ReadonlyArray<UiFrameworkCssAdapter> = [
  svelteKitCssAdapter,
  viteVueCssAdapter,
  viteCssModulesAdapter,
  angularCssAdapter,
];

/* -------------------------------------------------------------------------- */
/* Lift engine                                                                 */
/* -------------------------------------------------------------------------- */

export interface LiftUiAssetsOptions {
  /** Source app build root (framework-specific meaning; see adapter docs). */
  readonly buildRoot: string;
  /** Explicit adapter; default: first registry adapter whose detect() passes. */
  readonly adapter?: UiFrameworkCssAdapter;
  /** Emitted href prefix for per-route bundles. Default `/assets/original-css`. */
  readonly bundleHrefPrefix?: string;
  /** Emitted href prefix for `url()` assets. Default `/assets/original`. */
  readonly assetHrefPrefix?: string;
}

export interface UiAssetLiftHole {
  /** `legacy:css-scoping-<scheme>` (rule 5). */
  readonly reason: string;
  readonly detail: string;
}

export type LiftUiAssetsResult =
  | {
      readonly ok: true;
      readonly framework: string;
      readonly bundles: ReadonlyArray<UiStylesheetBundle>;
      /** Fallback bundle (root layout: theme variables, global styles), if any. */
      readonly fallbackBundle: UiStylesheetBundle | null;
      readonly map: UiRouteStyleMapV1;
      /** `url()` assets to copy: source absolute path → emitted href. */
      readonly assetCopies: ReadonlyArray<{ readonly sourcePath: string; readonly href: string }>;
      readonly selectorsDropped: number;
    }
  | { readonly ok: false; readonly hole: UiAssetLiftHole };

interface DescopedFile {
  readonly css: string;
  readonly selectors: ReadonlyArray<string>;
  readonly dropped: ReadonlyArray<string>;
}

function descopeStylesheet(raw: string, adapter: UiFrameworkCssAdapter): DescopedFile {
  const root = postcss.parse(raw);
  const selectors: string[] = [];
  const dropped: string[] = [];
  root.walkRules((rule) => {
    const parent = rule.parent;
    if (parent !== undefined && parent.type === "atrule" && /keyframes/i.test((parent as postcss.AtRule).name)) {
      return;
    }
    const kept: string[] = [];
    for (const sel of rule.selectors) {
      const out = adapter.descopeSelector(sel);
      if (out !== null) {
        kept.push(out);
        selectors.push(out);
      } else {
        dropped.push(sel);
      }
    }
    if (kept.length === 0) {
      rule.remove();
      return;
    }
    rule.selectors = kept;
  });
  root.walkAtRules((at) => {
    if ((at.name === "media" || at.name === "supports") && (at.nodes === undefined || at.nodes.length === 0)) {
      at.remove();
    }
  });
  return { css: root.toString(), selectors, dropped };
}

const URL_REF = /url\(\s*(['"]?)([^)'"]+)\1\s*\)/g;

function rewriteUrls(
  css: string,
  stylesheetAbsPath: string,
  assetHrefPrefix: string,
  copies: Map<string, string>,
): string {
  const baseDir = stylesheetAbsPath.replace(/[\\/][^\\/]*$/, "");
  return css.replace(URL_REF, (whole, _q: string, ref: string) => {
    if (/^(?:data:|https?:|\/\/|\/|#)/.test(ref)) return whole;
    const clean = ref.replace(/^\.\//, "").split(/[?#]/)[0] ?? "";
    if (clean === "" || clean.includes("..")) return whole;
    const src = join(baseDir, clean);
    if (!existsSync(src)) return whole;
    const base = clean.split(/[\\/]/).pop() ?? clean;
    const href = `${assetHrefPrefix}/${base}`;
    copies.set(src, href);
    return `url(${href})`;
  });
}

/** Route id → URL-safe bundle slug. */
export { uiRouteBundleSlug } from "./ui-route-patterns.js";

/**
 * Lift a source app's scoped CSS into per-route bundles plus a route→bundle
 * map. Pure computation over the build output: callers write bundles/assets
 * to disk (the CLI does; tests assert in memory).
 */
export function liftUiAssets(opts: LiftUiAssetsOptions): LiftUiAssetsResult {
  const adapter = opts.adapter ?? UI_FRAMEWORK_CSS_ADAPTERS.find((a) => a.detect(opts.buildRoot));
  if (adapter === undefined) {
    return {
      ok: false,
      hole: {
        reason: "legacy:css-scoping-unknown",
        detail: `no UI framework CSS adapter detected at ${opts.buildRoot}; supported: ${UI_FRAMEWORK_CSS_ADAPTERS.map((a) => a.name).join(", ")}`,
      },
    };
  }
  if (!adapter.detect(opts.buildRoot)) {
    return {
      ok: false,
      hole: {
        reason: `legacy:css-scoping-${adapter.name}`,
        detail: `adapter ${adapter.name} did not detect a build at ${opts.buildRoot}`,
      },
    };
  }

  const bundleHrefPrefix = opts.bundleHrefPrefix ?? "/assets/original-css";
  const assetHrefPrefix = opts.assetHrefPrefix ?? "/assets/original";
  const { routes, fallbackStylesheets } = adapter.routeStyleSources(opts.buildRoot);

  const fileCache = new Map<string, DescopedFile & { readonly abs: string }>();
  const assetCopies = new Map<string, string>();
  let selectorsDropped = 0;

  const liftFile = (stylesheet: string): (DescopedFile & { readonly abs: string }) | null => {
    const cached = fileCache.get(stylesheet);
    if (cached !== undefined) return cached;
    const abs = adapter.resolveStylesheet(opts.buildRoot, stylesheet);
    if (!existsSync(abs)) return null;
    const raw = readFileSync(abs, "utf8");
    const descoped = descopeStylesheet(raw, adapter);
    selectorsDropped += descoped.dropped.length;
    const css = rewriteUrls(descoped.css, abs, assetHrefPrefix, assetCopies);
    const entry = { ...descoped, css: `/* lifted: ${stylesheet} */\n${css}`, abs };
    fileCache.set(stylesheet, entry);
    return entry;
  };

  const buildBundle = (
    routeId: string,
    href: string,
    stylesheets: ReadonlyArray<string>,
  ): UiStylesheetBundle | null => {
    const lifted = stylesheets
      .map((s) => ({ stylesheet: s, file: liftFile(s) }))
      .filter((x): x is { stylesheet: string; file: DescopedFile & { abs: string } } => x.file !== null);
    if (lifted.length === 0) return null;
    const css = lifted.map((x) => x.file.css).join("\n");
    if (css.trim().length === 0) return null;
    const provenance: Provenance[] = lifted.map((x) => ({
      source: "ui-asset-lift",
      locator: { kind: "asset", file: x.stylesheet },
      reason: `de-scoped ${adapter.name} stylesheet for route ${routeId}`,
    }));
    return {
      routeId,
      href,
      css,
      selectors: lifted.flatMap((x) => x.file.selectors),
      droppedSelectors: lifted.flatMap((x) => x.file.dropped),
      sourceFiles: lifted.map((x) => x.stylesheet),
      provenance,
    };
  };

  const bundles: UiStylesheetBundle[] = [];
  const mapRoutes: { routeId: string; pattern: string; href: string }[] = [];
  for (const route of routes) {
    const href = `${bundleHrefPrefix}/${uiRouteBundleSlug(route.routeId)}.css`;
    const bundle = buildBundle(route.routeId, href, route.stylesheets);
    if (bundle === null) continue;
    bundles.push(bundle);
    mapRoutes.push({ routeId: route.routeId, pattern: adapter.routePatternSource(route.routeId), href });
  }

  const fallbackBundle =
    fallbackStylesheets.length > 0
      ? buildBundle("(layout)", `${bundleHrefPrefix}/_layout.css`, fallbackStylesheets)
      : null;

  const map: UiRouteStyleMapV1 = {
    kind: UI_ROUTE_STYLE_MAP_KIND,
    schemaVersion: UI_ROUTE_STYLE_MAP_SCHEMA_VERSION,
    framework: adapter.name,
    routes: mapRoutes,
    fallbackHref: fallbackBundle !== null ? fallbackBundle.href : null,
    assets: [...assetCopies.entries()].map(([sourcePath, href]): UiLiftedAssetRef => ({
      sourceFile: sourcePath,
      href,
    })),
  };

  return {
    ok: true,
    framework: adapter.name,
    bundles,
    fallbackBundle,
    map,
    assetCopies: [...assetCopies.entries()].map(([sourcePath, href]) => ({ sourcePath, href })),
    selectorsDropped,
  };
}

export type SuccessfulLiftUiAssetsResult = Extract<LiftUiAssetsResult, { ok: true }>;

export interface WriteUiAssetLiftArtifactsOptions {
  readonly bundleDir: string;
  readonly assetsDir: string;
  readonly mapPath: string;
  /** When true, remove `bundleDir` before writing (WISP refresh). */
  readonly cleanBundleDir?: boolean;
}

export interface WriteUiAssetLiftArtifactsResult {
  readonly mapPath: string;
  readonly bundlePaths: ReadonlyArray<string>;
  readonly assetPaths: ReadonlyArray<string>;
}

/** Write lift bundles, copied `url()` assets, and the route→stylesheet map to disk. */
export function writeUiAssetLiftArtifacts(
  result: SuccessfulLiftUiAssetsResult,
  opts: WriteUiAssetLiftArtifactsOptions,
): WriteUiAssetLiftArtifactsResult {
  if (opts.cleanBundleDir === true && existsSync(opts.bundleDir)) {
    rmSync(opts.bundleDir, { recursive: true, force: true });
  }
  mkdirSync(opts.bundleDir, { recursive: true });
  mkdirSync(opts.assetsDir, { recursive: true });
  const allBundles = [...result.bundles, ...(result.fallbackBundle !== null ? [result.fallbackBundle] : [])];
  const bundlePaths: string[] = [];
  for (const bundle of allBundles) {
    const name = bundle.href.split("/").pop() ?? "bundle.css";
    const path = join(opts.bundleDir, name);
    writeFileSync(path, bundle.css, "utf8");
    bundlePaths.push(path);
  }
  const assetPaths: string[] = [];
  for (const copy of result.assetCopies) {
    const name = copy.href.split("/").pop() ?? basename(copy.sourcePath);
    const path = join(opts.assetsDir, name);
    cpSync(copy.sourcePath, path);
    assetPaths.push(path);
  }
  writeFileSync(opts.mapPath, `${JSON.stringify(result.map, null, 2)}\n`, "utf8");
  return { mapPath: opts.mapPath, bundlePaths, assetPaths };
}
