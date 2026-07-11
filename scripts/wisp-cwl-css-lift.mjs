#!/usr/bin/env node
/**
 * WISP wrapper over the UI asset lift (DESIGN D6365, G9300e).
 */
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import { loadWispPipelineConfig, resolveWispRoot } from "./wisp-cwl-pipeline.mjs";

export const WISP_CWL_CSS_LIFT_KIND = "chrysalis.wisp.css-lift";
export const WISP_CWL_CSS_LIFT_SCHEMA_VERSION = 3;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixtureDir = join(scriptRoot, "fixtures/hub-wisp-management");
const outCssDir = join(fixtureDir, "original-css");
const outAssetsDir = join(fixtureDir, "original-assets");
const outMapPath = join(fixtureDir, "wisp-cwl-original-css-map.json");

/**
 * @param {object} [opts]
 * @param {string} [opts.wispRoot]
 */
export async function runWispCwlCssLift(opts = {}) {
  const config = loadWispPipelineConfig();
  const wispRoot = resolve(opts.wispRoot ?? resolveWispRoot(config));
  const base = {
    kind: WISP_CWL_CSS_LIFT_KIND,
    schemaVersion: WISP_CWL_CSS_LIFT_SCHEMA_VERSION,
    ok: false,
    wispRoot,
    outCssDir,
    outMapPath,
  };

  const ingestDist = join(scriptRoot, "packages/ingest/dist/ui-assets.js");
  if (!existsSync(ingestDist)) {
    return { ...base, skip: "ingest-dist-missing", hint: "pnpm --filter @chrysalis/ingest build" };
  }
  const { liftUiAssets, writeUiAssetLiftArtifacts } = await import(pathToFileURL(ingestDist).href);

  const result = liftUiAssets({ buildRoot: wispRoot });
  if (!result.ok) {
    return { ...base, hole: result.hole };
  }

  const written = writeUiAssetLiftArtifacts(result, {
    bundleDir: outCssDir,
    assetsDir: outAssetsDir,
    mapPath: outMapPath,
    cleanBundleDir: true,
  });

  return {
    ...base,
    ok: true,
    framework: result.framework,
    bundles: result.bundles.length,
    fallbackBundle: result.fallbackBundle !== null,
    urlAssetsCopied: written.assetPaths.length,
    selectorsDropped: result.selectorsDropped,
  };
}

if (process.argv[1]?.includes("wisp-cwl-css-lift")) {
  const r = await runWispCwlCssLift();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}
