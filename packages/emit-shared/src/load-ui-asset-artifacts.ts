/**
 * Load UI asset (CSS) lift artifacts from `.chrysalis/ui-assets/` (G9300 / G9470).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { UiRouteStyleMapV1 } from "@chrysalis/webir";
import { parseUiRouteStyleMapJson, UI_ROUTE_STYLE_MAP_KIND } from "@chrysalis/webir";

export interface LoadedUiAssetArtifacts {
  readonly map: UiRouteStyleMapV1;
  readonly mapPath: string;
  readonly cssDir: string;
  readonly assetsDir: string | null;
}

/** Read style map JSON from a lift output directory. */
export function loadUiAssetLiftArtifacts(uiAssetsDir: string): LoadedUiAssetArtifacts | null {
  const mapPath = join(uiAssetsDir, "ui-route-style-map.json");
  if (!existsSync(mapPath)) return null;
  const parsed = parseUiRouteStyleMapJson(readFileSync(mapPath, "utf8"));
  if (!parsed.ok) return null;
  if (parsed.map.kind !== UI_ROUTE_STYLE_MAP_KIND) return null;

  const cssDir = join(uiAssetsDir, "original-css");
  if (!existsSync(cssDir)) return null;

  const assetsDir = join(uiAssetsDir, "original-assets");
  return {
    map: parsed.map,
    mapPath,
    cssDir,
    assetsDir: existsSync(assetsDir) ? assetsDir : null,
  };
}
