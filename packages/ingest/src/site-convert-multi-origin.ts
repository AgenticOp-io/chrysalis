/**
 * Shared multi-origin convert-site orchestration (G9943 / D6428).
 *
 * One API over `convertSiteProjectUi` for any origin fixture/project —
 * no per-framework publish forks. Unlocks Tier C readiness.
 */
import {
  convertSiteProjectUi,
  type ConvertSiteProjectOptions,
  type ConvertSiteProjectResult,
} from "./site-convert.js";

export const MULTI_ORIGIN_CONVERT_KIND = "chrysalis.multi-origin-convert.v1";
export const MULTI_ORIGIN_CONVERT_SCHEMA_VERSION = 1;

export type MultiOriginConvertProjectSpec = {
  readonly id: string;
  readonly projectDir: string;
};

export type MultiOriginConvertProjectResult = {
  readonly id: string;
  readonly projectDir: string;
  readonly ok: boolean;
  readonly framework: string | null;
  readonly markupFramework: string | null;
  readonly assetBundleCount: number;
  readonly markupBundleCount: number;
  readonly skip: string | null;
  readonly result: ConvertSiteProjectResult;
};

export type MultiOriginConvertResult = {
  readonly kind: typeof MULTI_ORIGIN_CONVERT_KIND;
  readonly schemaVersion: typeof MULTI_ORIGIN_CONVERT_SCHEMA_VERSION;
  readonly ok: boolean;
  readonly projects: ReadonlyArray<MultiOriginConvertProjectResult>;
};

function frameworkOf(lift: ConvertSiteProjectResult["uiAssets"] | ConvertSiteProjectResult["uiMarkup"]): string | null {
  if (!lift || typeof lift !== "object") return null;
  if ("skip" in lift && lift.skip) return null;
  if ("framework" in lift && typeof lift.framework === "string") return lift.framework;
  return null;
}

function bundleCount(lift: ConvertSiteProjectResult["uiAssets"] | ConvertSiteProjectResult["uiMarkup"]): number {
  if (!lift || typeof lift !== "object") return 0;
  if ("bundles" in lift && Array.isArray(lift.bundles)) return lift.bundles.length;
  return 0;
}

/**
 * Run the same convert-site options across multiple origin projects.
 * Callers supply project dirs; this module does not special-case Vue/Next/Angular.
 */
export function convertMultiOriginProjects(
  opts: {
    readonly projects: ReadonlyArray<MultiOriginConvertProjectSpec>;
  } & Omit<ConvertSiteProjectOptions, "projectDir">,
): MultiOriginConvertResult {
  const { projects, ...convertOpts } = opts;
  const results: MultiOriginConvertProjectResult[] = [];

  for (const spec of projects) {
    const result = convertSiteProjectUi({
      ...convertOpts,
      projectDir: spec.projectDir,
      liftOnly: convertOpts.liftOnly ?? true,
      writeReport: convertOpts.writeReport ?? false,
      markupMode: convertOpts.markupMode ?? "structural-shell",
    });
    const skip =
      result.uiAssets && "skip" in result.uiAssets && result.uiAssets.skip
        ? String(result.uiAssets.skip)
        : result.uiMarkup && "skip" in result.uiMarkup && result.uiMarkup.skip
          ? String(result.uiMarkup.skip)
          : null;
    results.push({
      id: spec.id,
      projectDir: spec.projectDir,
      ok: result.ok === true,
      framework: frameworkOf(result.uiAssets),
      markupFramework: frameworkOf(result.uiMarkup),
      assetBundleCount: bundleCount(result.uiAssets),
      markupBundleCount: bundleCount(result.uiMarkup),
      skip,
      result,
    });
  }

  return {
    kind: MULTI_ORIGIN_CONVERT_KIND,
    schemaVersion: MULTI_ORIGIN_CONVERT_SCHEMA_VERSION,
    ok: results.length > 0 && results.every((r) => r.ok),
    projects: results,
  };
}
