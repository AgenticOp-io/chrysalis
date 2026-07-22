/**
 * UI markup lift (DESIGN D6365 extension, G9306; structural-shell D6367 / G9460).
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type {
  Provenance,
  UiMarkupBundle,
  UiMarkupLiftHoleRecord,
  UiMarkupLiftMode,
  UiRouteMarkupMapV1,
} from "@chrysalis/webir";
import { UI_ROUTE_MARKUP_MAP_KIND, UI_ROUTE_MARKUP_MAP_SCHEMA_VERSION } from "@chrysalis/webir";
import { extractHtmlClassNames, svelteKitMarkupAdapter } from "./ui-markup-svelte.js";
import { viteVueMarkupAdapter } from "./ui-markup-vue.js";
import { angularMarkupAdapter } from "./ui-markup-angular.js";
import { nextAppMarkupAdapter } from "./ui-markup-next.js";
import { phpBladeMarkupAdapter } from "./ui-markup-blade.js";
import { uiRouteBundleSlug } from "./ui-route-patterns.js";
import type { LiftStructuralSvelteOptions } from "./ui-markup-svelte-structural.js";
import { indexSvelteComponentSources } from "./ui-markup-svelte-structural.js";

export interface UiRouteMarkupSources {
  readonly routeId: string;
  readonly sourceFiles: ReadonlyArray<string>;
}

export interface UiMarkupPageLiftDetail {
  readonly html: string;
  readonly liftMode?: UiMarkupLiftMode;
  readonly holes?: ReadonlyArray<UiMarkupLiftHoleRecord>;
}

export interface UiFrameworkMarkupAdapter {
  readonly name: string;
  detect(buildRoot: string): boolean;
  routeMarkupSources(buildRoot: string): { readonly routes: ReadonlyArray<UiRouteMarkupSources> };
  resolveSourceFile(buildRoot: string, sourceFile: string): string;
  /** Static-only lift; return null when the page is not fully static. */
  liftPageHtml(source: string, routeId: string): string | null;
  /**
   * Optional richer lift (structural-shell). When present and `mode` is
   * `structural-shell`, used instead of {@link liftPageHtml}.
   */
  liftPageMarkup?(
    source: string,
    routeId: string,
    mode: "static" | "structural-shell",
    structuralOpts?: LiftStructuralSvelteOptions,
    /** Absolute source path when available (Angular DI graph G9931). */
    fileAbsPath?: string,
  ): UiMarkupPageLiftDetail | null;
  routePatternSource(routeId: string): string;
}

export type UiMarkupLiftModeOption = "static" | "structural-shell";

export const UI_FRAMEWORK_MARKUP_ADAPTERS: ReadonlyArray<UiFrameworkMarkupAdapter> = [
  svelteKitMarkupAdapter,
  viteVueMarkupAdapter,
  angularMarkupAdapter,
  nextAppMarkupAdapter,
  phpBladeMarkupAdapter,
];

export interface LiftUiMarkupOptions {
  readonly buildRoot: string;
  readonly adapter?: UiFrameworkMarkupAdapter;
  readonly bundleHrefPrefix?: string;
  /**
   * `static` (default): skip pages with residual dynamics.
   * `structural-shell`: keep layout HTML and declare holes for dynamics (D6367).
   */
  readonly mode?: UiMarkupLiftModeOption;
  /** Structural-shell options (showcase loadBools, component inline) — G9500. */
  readonly structuralOpts?: LiftStructuralSvelteOptions;
}

export interface UiMarkupLiftHole {
  readonly reason: string;
  readonly detail: string;
}

export type LiftUiMarkupResult =
  | {
      readonly ok: true;
      readonly framework: string;
      readonly bundles: ReadonlyArray<UiMarkupBundle>;
      readonly map: UiRouteMarkupMapV1;
      readonly routesSkipped: number;
    }
  | { readonly ok: false; readonly hole: UiMarkupLiftHole };

export type SuccessfulLiftUiMarkupResult = Extract<LiftUiMarkupResult, { ok: true }>;

export interface WriteUiMarkupLiftArtifactsOptions {
  readonly bundleDir: string;
  readonly mapPath: string;
  readonly cleanBundleDir?: boolean;
}

export interface WriteUiMarkupLiftArtifactsResult {
  readonly mapPath: string;
  readonly bundlePaths: ReadonlyArray<string>;
}

function liftOneSource(
  adapter: UiFrameworkMarkupAdapter,
  raw: string,
  routeId: string,
  mode: UiMarkupLiftModeOption,
  structuralOpts?: LiftStructuralSvelteOptions,
  fileAbsPath?: string,
): UiMarkupPageLiftDetail | null {
  if (adapter.liftPageMarkup !== undefined) {
    return adapter.liftPageMarkup(raw, routeId, mode, structuralOpts, fileAbsPath);
  }
  const html = adapter.liftPageHtml(raw, routeId);
  if (html === null) return null;
  return { html, liftMode: "static", holes: [] };
}

/** Lift HTML fragments per source route (static or structural-shell). */
export function liftUiMarkup(opts: LiftUiMarkupOptions): LiftUiMarkupResult {
  const adapter =
    opts.adapter ?? UI_FRAMEWORK_MARKUP_ADAPTERS.find((a) => a.detect(opts.buildRoot));
  if (adapter === undefined) {
    return {
      ok: false,
      hole: {
        reason: "legacy:markup-lift-unknown",
        detail: `no UI framework markup adapter detected at ${opts.buildRoot}`,
      },
    };
  }
  if (!adapter.detect(opts.buildRoot)) {
    return {
      ok: false,
      hole: {
        reason: `legacy:markup-lift-${adapter.name}`,
        detail: `adapter ${adapter.name} did not detect markup sources at ${opts.buildRoot}`,
      },
    };
  }

  const mode: UiMarkupLiftModeOption = opts.mode ?? "static";
  const bundleHrefPrefix = opts.bundleHrefPrefix ?? "/assets/original-html";
  const srcRoot = existsSync(join(opts.buildRoot, "src"))
    ? join(opts.buildRoot, "src")
    : opts.buildRoot;
  const structuralOpts: LiftStructuralSvelteOptions = {
    applyShowcaseLoadBools: mode === "structural-shell",
    componentSources: indexSvelteComponentSources(srcRoot),
    ...(opts.structuralOpts ?? {}),
  };
  const { routes } = adapter.routeMarkupSources(opts.buildRoot);
  const bundles: UiMarkupBundle[] = [];
  const mapRoutes: { routeId: string; pattern: string; href: string }[] = [];
  let routesSkipped = 0;

  for (const route of routes) {
    const liftedParts: string[] = [];
    const sourceFiles: string[] = [];
    const provenance: Provenance[] = [];
    const routeHoles: UiMarkupLiftHoleRecord[] = [];
    let liftMode: UiMarkupLiftMode = "static";
    for (const rel of route.sourceFiles) {
      const abs = adapter.resolveSourceFile(opts.buildRoot, rel);
      if (!existsSync(abs)) continue;
      const raw = readFileSync(abs, "utf8");
      const detail = liftOneSource(adapter, raw, route.routeId, mode, structuralOpts, abs);
      if (detail === null) {
        routesSkipped += 1;
        continue;
      }
      liftedParts.push(detail.html);
      sourceFiles.push(rel);
      if (detail.liftMode === "structural-shell") liftMode = "structural-shell";
      if (detail.holes !== undefined) routeHoles.push(...detail.holes);
      provenance.push({
        source: "ui-markup-lift",
        locator: { kind: "asset", file: rel },
        reason:
          detail.liftMode === "structural-shell"
            ? `structural-shell markup lift for route ${route.routeId}`
            : `static markup lift for route ${route.routeId}`,
      });
    }
    if (liftedParts.length === 0) continue;
    const html = liftedParts.join("\n");
    const href = `${bundleHrefPrefix}/${uiRouteBundleSlug(route.routeId)}.html`;
    bundles.push({
      routeId: route.routeId,
      href,
      html,
      classNames: extractHtmlClassNames(html),
      sourceFiles,
      provenance,
      liftMode,
      holes: routeHoles,
    });
    mapRoutes.push({
      routeId: route.routeId,
      pattern: adapter.routePatternSource(route.routeId),
      href,
    });
  }

  if (bundles.length === 0) {
    return {
      ok: false,
      hole: {
        reason: `legacy:markup-lift-${adapter.name}`,
        detail: `no markup could be lifted at ${opts.buildRoot} (${routesSkipped} route(s) skipped)`,
      },
    };
  }

  const map: UiRouteMarkupMapV1 = {
    kind: UI_ROUTE_MARKUP_MAP_KIND,
    schemaVersion: UI_ROUTE_MARKUP_MAP_SCHEMA_VERSION,
    framework: adapter.name,
    routes: mapRoutes,
    fallbackHref: null,
  };

  return { ok: true, framework: adapter.name, bundles, map, routesSkipped };
}

/** Write lifted HTML bundles and the route map to disk. */
export function writeUiMarkupLiftArtifacts(
  result: SuccessfulLiftUiMarkupResult,
  opts: WriteUiMarkupLiftArtifactsOptions,
): WriteUiMarkupLiftArtifactsResult {
  if (opts.cleanBundleDir === true && existsSync(opts.bundleDir)) {
    rmSync(opts.bundleDir, { recursive: true, force: true });
  }
  mkdirSync(opts.bundleDir, { recursive: true });
  const bundlePaths: string[] = [];
  for (const bundle of result.bundles) {
    const name = bundle.href.split("/").pop() ?? "fragment.html";
    const path = join(opts.bundleDir, name);
    writeFileSync(path, bundle.html, "utf8");
    bundlePaths.push(path);
  }
  writeFileSync(opts.mapPath, `${JSON.stringify(result.map, null, 2)}\n`, "utf8");
  return { mapPath: opts.mapPath, bundlePaths };
}
