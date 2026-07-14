#!/usr/bin/env node
/**
 * G9942 — Vue/Nuxt layout SFC CSS attributed per page without Vite dist.
 *
 * Run: pnpm run hub:vue-nuxt-layout-css-smoke
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const VUE_NUXT_LAYOUT_CSS_SMOKE_KIND = "chrysalis.hub.vue-nuxt-layout-css-smoke";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function loadIngest() {
  try {
    return await import("@chrysalis/ingest");
  } catch {
    return import(pathToFileURL(join(ROOT, "packages/ingest/dist/index.js")).href);
  }
}

export async function runVueNuxtLayoutCssSmoke() {
  const fixture = join(ROOT, "fixtures/ui-markup-vue");
  if (!existsSync(fixture)) {
    return {
      kind: VUE_NUXT_LAYOUT_CSS_SMOKE_KIND,
      schemaVersion: 1,
      ok: false,
      skip: "missing-vue-fixture",
    };
  }

  const ingest = await loadIngest();
  if (typeof ingest.collectVueLayoutStylesheets !== "function") {
    return {
      kind: VUE_NUXT_LAYOUT_CSS_SMOKE_KIND,
      schemaVersion: 1,
      ok: false,
      error: "collectVueLayoutStylesheets missing — rebuild @chrysalis/ingest",
    };
  }

  const loginPage = join(fixture, "src/views/login.vue");
  const portalPage = join(fixture, "src/views/portal/login.vue");

  const metaOk =
    ingest.parseVuePageLayoutName('definePageMeta({ layout: "portal" })') === "portal" &&
    ingest.parseVuePageLayoutName("<script setup>\nconst x = 1\n</script>") === null;

  const loginLayouts = ingest.collectVueLayoutStylesheets(fixture, loginPage);
  const portalLayouts = ingest.collectVueLayoutStylesheets(fixture, portalPage);
  const collectOk =
    loginLayouts.some((s) => s.includes("layouts/default.vue")) &&
    !loginLayouts.some((s) => s.includes("layouts/portal.vue")) &&
    portalLayouts.some((s) => s.includes("layouts/portal.vue")) &&
    !portalLayouts.some((s) => s.includes("layouts/default.vue"));

  const assets = ingest.liftProjectUiAssets({ projectDir: fixture });
  const assetsOk =
    assets.ok === true &&
    "framework" in assets &&
    assets.framework === "vite-vue" &&
    "bundles" in assets &&
    Array.isArray(assets.bundles);

  const login =
    assetsOk && "bundles" in assets
      ? assets.bundles.find((b) => b.routeId === "/login")
      : undefined;
  const portal =
    assetsOk && "bundles" in assets
      ? assets.bundles.find((b) => b.routeId === "/portal/login")
      : undefined;

  const isolationOk =
    login?.css.includes("--vue-layout-token") === true &&
    login?.css.includes("--vue-portal-layout-token") !== true &&
    login?.css.includes("#111827") === true &&
    portal?.css.includes("--vue-portal-layout-token") === true &&
    portal?.css.includes("--vue-layout-token") !== true &&
    portal?.css.includes("#0d9488") === true;

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

  const ok = metaOk && collectOk && assetsOk && isolationOk && convertOk;

  return {
    kind: VUE_NUXT_LAYOUT_CSS_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    metaOk,
    collectOk,
    assetsOk,
    isolationOk,
    convertOk,
    loginLayouts,
    portalLayouts,
    note: "Vue/Nuxt layout SFC CSS attributed per page; portal layout does not leak to /login",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runVueNuxtLayoutCssSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-vue-nuxt-layout-css-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
