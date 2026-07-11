/**
 * Whole-site UI conversion orchestrator (DESIGN D6366, G9400).
 *
 * Lifts per-route CSS + static HTML into `.chrysalis/ui-assets/` and
 * `.chrysalis/ui-markup/`, then optionally patches CWL `@page` bodies.
 * Backend/API conversion remains `port-site` / WebIR ingest — this module
 * owns the frontend surface half of whole-site CWL export.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  applyLiftedMarkupToCwlSource,
  loadUiMarkupLiftArtifacts,
  type ApplyUiMarkupToCwlResult,
} from "@chrysalis/emit-shared";
import {
  liftProjectUiAssets,
  type LiftProjectUiAssetsResult,
} from "./ui-assets-discover.js";
import {
  liftProjectUiMarkup,
  type LiftProjectUiMarkupResult,
} from "./ui-markup-discover.js";
import {
  bindSiteProjectLoadFromTraces,
  type BindSiteProjectLoadResult,
} from "./site-load-bind.js";

export const SITE_CONVERT_REPORT_KIND = "chrysalis.site-convert.v1";
export const SITE_CONVERT_REPORT_SCHEMA_VERSION = 2;

export interface ConvertSiteProjectOptions {
  readonly projectDir: string;
  /** CWL files to patch. Defaults to migration.cwl + generated/cwl/routes.cwl when present. */
  readonly cwlPaths?: readonly string[];
  /** Lift artifacts only; skip CWL patch. Default false. */
  readonly liftOnly?: boolean;
  /**
   * Markup lift mode. Default `structural-shell` for whole-site convert (D6367)
   * so interactive pages become layout shells with explicit holes instead of skips.
   */
  readonly markupMode?: "static" | "structural-shell";
  /** Oracle trace corpus root — binds traced API JSON into `load { }` (G9430). */
  readonly tracesDir?: string;
  /** Write `.chrysalis/site-convert.json`. Default true. */
  readonly writeReport?: boolean;
}

export interface CwlMarkupPatchResult {
  readonly path: string;
  readonly skip: string | null;
  readonly routesPatched: number;
  readonly routesSkipped: number;
  readonly routesWithoutBundle: number;
}

export interface ConvertSiteProjectResult {
  readonly kind: typeof SITE_CONVERT_REPORT_KIND;
  readonly schemaVersion: typeof SITE_CONVERT_REPORT_SCHEMA_VERSION;
  readonly ok: boolean;
  readonly projectDir: string;
  readonly uiAssets: LiftProjectUiAssetsResult;
  readonly uiMarkup: LiftProjectUiMarkupResult;
  readonly cwlPatches: readonly CwlMarkupPatchResult[];
  readonly loadBind: BindSiteProjectLoadResult | null;
  /** Path to written report when `writeReport` was enabled. */
  readonly reportPath?: string;
}

/** Resolve default CWL targets under a project tree. */
export function defaultSiteConvertCwlPaths(projectDir: string): string[] {
  const candidates = [
    join(projectDir, ".chrysalis", "migration.cwl"),
    join(projectDir, "generated", "cwl", "routes.cwl"),
    join(projectDir, "routes.cwl"),
  ];
  return candidates.filter((p) => existsSync(p));
}

function patchCwlWithLiftedMarkup(cwlPath: string, uiMarkupDir: string): CwlMarkupPatchResult {
  const loaded = loadUiMarkupLiftArtifacts(uiMarkupDir);
  if (loaded === null) {
    return {
      path: cwlPath,
      skip: "no-ui-markup-artifacts",
      routesPatched: 0,
      routesSkipped: 0,
      routesWithoutBundle: 0,
    };
  }
  const source = readFileSync(cwlPath, "utf8");
  const patched: ApplyUiMarkupToCwlResult = applyLiftedMarkupToCwlSource(
    source,
    loaded.map,
    loaded.bundles,
  );
  if (patched.routesPatched > 0) {
    writeFileSync(cwlPath, patched.text, "utf8");
  }
  return {
    path: cwlPath,
    skip: patched.routesPatched > 0 ? null : "no-routes-patched",
    routesPatched: patched.routesPatched,
    routesSkipped: patched.routesSkipped,
    routesWithoutBundle: patched.routesWithoutBundle,
  };
}

function summarizeLift(lift: LiftProjectUiAssetsResult | LiftProjectUiMarkupResult): Record<string, unknown> {
  if (!lift.ok) return { ok: false, hole: "hole" in lift ? lift.hole : null };
  if ("skip" in lift) return { ok: true, skip: lift.skip };
  return {
    ok: true,
    framework: "framework" in lift ? lift.framework : null,
    bundleCount: "bundles" in lift ? lift.bundles.length : null,
    mapPath: "written" in lift ? lift.written.mapPath : null,
  };
}

/** Serialize a convert result for operator tooling (drops large bundle bodies). */
export function summarizeSiteConvertReport(result: ConvertSiteProjectResult): Record<string, unknown> {
  return {
    kind: result.kind,
    schemaVersion: result.schemaVersion,
    ok: result.ok,
    projectDir: result.projectDir,
    uiAssets: summarizeLift(result.uiAssets),
    uiMarkup: summarizeLift(result.uiMarkup),
    cwlPatches: result.cwlPatches,
    loadBind:
      result.loadBind === null
        ? null
        : {
            ok: result.loadBind.ok,
            tracesIndexed: result.loadBind.tracesIndexed,
            routesBound: result.loadBind.routes.filter((r) => r.skip === null).length,
            routes: result.loadBind.routes,
          },
    generatedAt: new Date().toISOString(),
  };
}

/** Write `.chrysalis/site-convert.json` next to other project artifacts. */
export function writeSiteConvertReport(projectDir: string, result: ConvertSiteProjectResult): string {
  const outDir = join(projectDir, ".chrysalis");
  mkdirSync(outDir, { recursive: true });
  const path = join(outDir, "site-convert.json");
  writeFileSync(path, `${JSON.stringify(summarizeSiteConvertReport(result), null, 2)}\n`, "utf8");
  return path;
}

/**
 * Lift frontend UI artifacts and patch CWL page handlers when markup bundles exist.
 * Holes from either lift stage propagate as `ok: false`.
 * Writes `.chrysalis/site-convert.json` unless `writeReport: false`.
 */
export function convertSiteProjectUi(opts: ConvertSiteProjectOptions): ConvertSiteProjectResult {
  const projectDir = opts.projectDir;
  const uiAssets = liftProjectUiAssets({ projectDir });
  const uiMarkup = liftProjectUiMarkup({
    projectDir,
    mode: opts.markupMode ?? "structural-shell",
  });

  const ok = uiAssets.ok !== false && uiMarkup.ok !== false;

  const cwlPatches: CwlMarkupPatchResult[] = [];
  let loadBind: BindSiteProjectLoadResult | null = null;
  const paths = opts.cwlPaths ?? defaultSiteConvertCwlPaths(projectDir);

  if (ok && opts.liftOnly !== true) {
    const uiMarkupDir = join(projectDir, ".chrysalis", "ui-markup");
    for (const cwlPath of paths) {
      cwlPatches.push(patchCwlWithLiftedMarkup(cwlPath, uiMarkupDir));
    }
  }

  const tracesDir = opts.tracesDir ?? join(projectDir, "traces");
  if (ok && opts.liftOnly !== true && existsSync(tracesDir) && paths.length > 0) {
    loadBind = bindSiteProjectLoadFromTraces({ tracesDir, cwlPaths: paths });
  }

  const loadOk = loadBind === null || loadBind.ok === true;

  const result: ConvertSiteProjectResult = {
    kind: SITE_CONVERT_REPORT_KIND,
    schemaVersion: SITE_CONVERT_REPORT_SCHEMA_VERSION,
    ok: ok && loadOk,
    projectDir,
    uiAssets,
    uiMarkup,
    cwlPatches,
    loadBind,
  };

  if (opts.writeReport !== false) {
    const reportPath = writeSiteConvertReport(projectDir, result);
    return { ...result, reportPath };
  }

  return result;
}
