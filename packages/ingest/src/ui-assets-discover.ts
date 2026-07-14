/**
 * Discover a frontend app build root and lift UI assets into a project (D6365, G9304).
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  liftUiAssets,
  svelteKitCssAdapter,
  writeUiAssetLiftArtifacts,
  type SuccessfulLiftUiAssetsResult,
  type UiAssetLiftHole,
  type WriteUiAssetLiftArtifactsResult,
} from "./ui-assets.js";
import { angularCssAdapter } from "./ui-assets-angular.js";
import { viteCssModulesAdapter } from "./ui-assets-css-modules.js";
import { viteVueCssAdapter } from "./ui-assets-vue.js";
import { nextAppCssAdapter } from "./ui-assets-next.js";

const DISCOVER_ADAPTERS = [
  svelteKitCssAdapter,
  viteVueCssAdapter,
  nextAppCssAdapter,
  viteCssModulesAdapter,
  angularCssAdapter,
] as const;

const SUBDIR_CANDIDATES = [
  "client",
  "frontend",
  "web",
  "app",
  "Module_Manager",
  "packages/web",
  "packages/client",
] as const;

function hasUiAssetBuild(root: string): boolean {
  return DISCOVER_ADAPTERS.some((adapter) => adapter.detect(root));
}

/**
 * Find the first subdirectory (or project root) whose build output is recognized
 * by a UI framework CSS adapter. Shallow scan only — no node_modules walk.
 */
export function discoverUiAssetBuildRoot(projectDir: string): string | null {
  if (hasUiAssetBuild(projectDir)) return projectDir;
  for (const name of SUBDIR_CANDIDATES) {
    const sub = join(projectDir, name);
    if (existsSync(sub) && hasUiAssetBuild(sub)) return sub;
  }
  return null;
}

export interface LiftProjectUiAssetsOptions {
  readonly projectDir: string;
  readonly outDir?: string;
}

export type LiftProjectUiAssetsResult =
  | (SuccessfulLiftUiAssetsResult & {
      readonly ok: true;
      readonly buildRoot: string;
      readonly written: WriteUiAssetLiftArtifactsResult;
    })
  | { readonly ok: true; readonly skip: string }
  | { readonly ok: false; readonly hole: UiAssetLiftHole };

/**
 * Discover a frontend build under `projectDir`, lift per-route CSS, and write
 * artifacts to `.chrysalis/ui-assets/`. Skips when no build is found (PHP-only).
 */
export function liftProjectUiAssets(opts: LiftProjectUiAssetsOptions): LiftProjectUiAssetsResult {
  const buildRoot = discoverUiAssetBuildRoot(opts.projectDir);
  if (buildRoot === null) {
    return { ok: true, skip: "no-frontend-build" };
  }
  const lift = liftUiAssets({ buildRoot });
  if (!lift.ok) {
    return { ok: false, hole: lift.hole };
  }
  const outRoot = opts.outDir ?? join(opts.projectDir, ".chrysalis", "ui-assets");
  const written = writeUiAssetLiftArtifacts(lift, {
    bundleDir: join(outRoot, "original-css"),
    assetsDir: join(outRoot, "original-assets"),
    mapPath: join(outRoot, "ui-route-style-map.json"),
    cleanBundleDir: true,
  });
  return { ...lift, ok: true, buildRoot, written };
}
