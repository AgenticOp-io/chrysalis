#!/usr/bin/env node
/**
 * G9929 — Vue scoped-CSS depth: SFC `<style scoped>` lift without Vite dist manifest.
 *
 * Run: pnpm run hub:vue-scoped-css-depth-smoke
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const VUE_SCOPED_CSS_DEPTH_SMOKE_KIND = "chrysalis.hub.vue-scoped-css-depth-smoke";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function loadIngest() {
  try {
    return await import("@chrysalis/ingest");
  } catch {
    return import(pathToFileURL(join(ROOT, "packages/ingest/dist/index.js")).href);
  }
}

export async function runVueScopedCssDepthSmoke() {
  const fixture = join(ROOT, "fixtures/ui-markup-vue");
  if (!existsSync(fixture)) {
    return {
      kind: VUE_SCOPED_CSS_DEPTH_SMOKE_KIND,
      schemaVersion: 1,
      ok: false,
      skip: "missing-vue-fixture",
    };
  }

  const ingest = await loadIngest();

  const unitCss = ingest.extractVueSfcStyleCss(`
<template><p/></template>
<style scoped>.a{color:red}:deep(.b){color:blue}</style>
`);
  const extractOk = typeof unitCss === "string" && unitCss.includes(".a") && unitCss.includes(":deep");

  const descopeOk =
    ingest.descopeVueSelector(":global(.toast)") === ".toast" &&
    ingest.descopeVueSelector("::v-deep(.child)") === ".child" &&
    ingest.descopeVueSelector(".x[data-v-abc]") === ".x";

  const assets = ingest.liftProjectUiAssets({ projectDir: fixture });
  const assetsOk =
    assets.ok === true &&
    !("skip" in assets && assets.skip) &&
    "framework" in assets &&
    assets.framework === "vite-vue" &&
    "bundles" in assets &&
    Array.isArray(assets.bundles) &&
    assets.bundles.length >= 1;

  const login =
    assetsOk && "bundles" in assets
      ? assets.bundles.find((b) => b.routeId === "/login")
      : undefined;
  const portal =
    assetsOk && "bundles" in assets
      ? assets.bundles.find((b) => b.routeId === "/portal/login")
      : undefined;

  const isolationOk =
    login?.css.includes("#111827") === true &&
    login?.css.includes(".child-slot") === true &&
    login?.css.includes(".toast") === true &&
    login?.css.includes("#0d9488") !== true &&
    portal?.css.includes("#0d9488") === true &&
    portal?.css.includes("#111827") !== true;

  const convert = ingest.convertSiteProjectUi({
    projectDir: fixture,
    liftOnly: true,
    writeReport: false,
    markupMode: "structural-shell",
  });
  const convertOk =
    convert.ok === true &&
    convert.uiAssets &&
    "framework" in convert.uiAssets &&
    convert.uiAssets.framework === "vite-vue";

  const ok = extractOk && descopeOk && assetsOk && isolationOk && convertOk;

  return {
    kind: VUE_SCOPED_CSS_DEPTH_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    extractOk,
    descopeOk,
    assetsOk,
    isolationOk,
    convertOk,
    loginSelectors: login?.selectors?.slice(0, 8) ?? [],
    note: "Vue SFC scoped CSS lifts without a Vite dist manifest — same convert-site path",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runVueScopedCssDepthSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-vue-scoped-css-depth-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
