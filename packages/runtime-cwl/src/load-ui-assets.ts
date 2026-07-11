/**
 * Resolve UI asset serve config from a project `.chrysalis/ui-assets/` tree (G9470).
 */
import { join } from "node:path";
import { loadUiAssetLiftArtifacts } from "@chrysalis/emit-shared";
import type { CwlUiAssetsServeConfig } from "./runtime.js";

/** Load style map + CSS dirs for {@link createCwlRuntime} `uiAssets`. */
export function loadCwlUiAssetsFromProject(projectDir: string): CwlUiAssetsServeConfig | null {
  const loaded = loadUiAssetLiftArtifacts(join(projectDir, ".chrysalis", "ui-assets"));
  if (loaded === null) return null;
  return {
    styleMap: loaded.map,
    cssDir: loaded.cssDir,
    assetsDir: loaded.assetsDir,
    wrapHtmlDocuments: true,
  };
}
