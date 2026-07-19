#!/usr/bin/env node
/**
 * WISP wrapper over the UI asset lift (DESIGN D6365, G9300e).
 */
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { loadWispPipelineConfig, resolveWispRoot } from "../wisp-cwl-pipeline.mjs";

export const WISP_CWL_CSS_LIFT_KIND = "chrysalis.wisp.css-lift";
export const WISP_CWL_CSS_LIFT_SCHEMA_VERSION = 3;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
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

  // Root +layout.svelte imports app.css, which in turn imports the centralized
  // theme and modal styles. Route-scoped Svelte CSS extraction cannot see that
  // global import graph, so carry it as a first-class bundle for every route.
  const globalCssSources = [
    join(wispRoot, "src/lib/config/theme.css"),
    join(wispRoot, "src/lib/styles/modal.css"),
    join(wispRoot, "src/app.css"),
  ];
  const missingGlobalCss = globalCssSources.filter((path) => !existsSync(path));
  if (missingGlobalCss.length) {
    return { ...base, skip: "origin-global-css-missing", missingGlobalCss };
  }
  const globalCss = globalCssSources
    .map((path) =>
      readFileSync(path, "utf8")
        // Imports are already expanded above (theme/modal), while the ArcGIS
        // theme is switched by the runtime to match the resolved theme.
        .replace(/^\s*@import\s+[^;]+;\s*$/gm, ""),
    )
    .join("\n\n");
  writeFileSync(
    join(outCssDir, "wisp-origin-global.css"),
    `/* Lifted from root +layout.svelte → app.css import graph. */\n${globalCss}\n`,
    "utf8",
  );

  return {
    ...base,
    ok: true,
    framework: result.framework,
    bundles: result.bundles.length,
    fallbackBundle: result.fallbackBundle !== null,
    urlAssetsCopied: written.assetPaths.length,
    globalThemeCss: true,
    selectorsDropped: result.selectorsDropped,
  };
}

if (process.argv[1]?.includes("wisp-cwl-css-lift")) {
  const r = await runWispCwlCssLift();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}
