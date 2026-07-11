/**
 * Discover a frontend source tree and lift per-route static HTML (G9306).
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { angularMarkupAdapter } from "./ui-markup-angular.js";
import { svelteKitMarkupAdapter } from "./ui-markup-svelte.js";
import { viteVueMarkupAdapter } from "./ui-markup-vue.js";
import {
  liftUiMarkup,
  writeUiMarkupLiftArtifacts,
  type LiftUiMarkupResult,
  type SuccessfulLiftUiMarkupResult,
  type UiMarkupLiftHole,
  type WriteUiMarkupLiftArtifactsResult,
} from "./ui-markup.js";

const MARKUP_DISCOVER_ADAPTERS = [svelteKitMarkupAdapter, viteVueMarkupAdapter, angularMarkupAdapter] as const;

const SUBDIR_CANDIDATES = [
  "client",
  "frontend",
  "web",
  "app",
  "Module_Manager",
  "packages/web",
  "packages/client",
] as const;

export function discoverUiMarkupProjectRoot(projectDir: string): string | null {
  if (MARKUP_DISCOVER_ADAPTERS.some((a) => a.detect(projectDir))) return projectDir;
  for (const name of SUBDIR_CANDIDATES) {
    const sub = join(projectDir, name);
    if (existsSync(sub) && MARKUP_DISCOVER_ADAPTERS.some((a) => a.detect(sub))) return sub;
  }
  return null;
}

export interface LiftProjectUiMarkupOptions {
  readonly projectDir: string;
  readonly outDir?: string;
  /** Default `static`. Use `structural-shell` for whole-site lift (D6367). */
  readonly mode?: "static" | "structural-shell";
}

export type LiftProjectUiMarkupResult =
  | (SuccessfulLiftUiMarkupResult & {
      readonly ok: true;
      readonly sourceRoot: string;
      readonly written: WriteUiMarkupLiftArtifactsResult;
    })
  | { readonly ok: true; readonly skip: string }
  | { readonly ok: false; readonly hole: UiMarkupLiftHole };

/** Lift static HTML into `.chrysalis/ui-markup/`. Skips when no liftable sources exist. */
export function liftProjectUiMarkup(opts: LiftProjectUiMarkupOptions): LiftProjectUiMarkupResult {
  const sourceRoot = discoverUiMarkupProjectRoot(opts.projectDir);
  if (sourceRoot === null) {
    return { ok: true, skip: "no-frontend-markup" };
  }
  const lift: LiftUiMarkupResult = liftUiMarkup({
    buildRoot: sourceRoot,
    mode: opts.mode ?? "static",
  });
  if (!lift.ok) {
    return { ok: false, hole: lift.hole };
  }
  const outRoot = opts.outDir ?? join(opts.projectDir, ".chrysalis", "ui-markup");
  const written = writeUiMarkupLiftArtifacts(lift, {
    bundleDir: join(outRoot, "original-html"),
    mapPath: join(outRoot, "ui-route-markup-map.json"),
    cleanBundleDir: true,
  });
  return { ...lift, ok: true, sourceRoot, written };
}
