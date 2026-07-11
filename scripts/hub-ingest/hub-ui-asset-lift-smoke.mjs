#!/usr/bin/env node
/** UI asset lift close smoke (G9300, DESIGN D6365). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_UI_ASSET_LIFT_SMOKE_KIND = "chrysalis.hub.ui-asset-lift-smoke";
export const HUB_UI_ASSET_LIFT_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const svelteFixture = join(scriptRoot, "fixtures/ui-assets-svelte");
const vueFixture = join(scriptRoot, "fixtures/ui-assets-vue");
const cssModulesFixture = join(scriptRoot, "fixtures/ui-assets-css-modules");
const angularFixture = join(scriptRoot, "fixtures/ui-assets-angular");

async function loadIngestUiAssets() {
  const dist = join(scriptRoot, "packages/ingest/dist/ui-assets.js");
  if (!existsSync(dist)) {
    throw new Error("packages/ingest/dist/ui-assets.js missing — run pnpm --filter @chrysalis/ingest build");
  }
  return import(pathToFileURL(dist).href);
}

/** G9300 — lift + per-route isolation + parity on svelte + vue fixtures. */
export async function runUiAssetLiftGate() {
  const design = join(scriptRoot, "DESIGN.md");
  if (!existsSync(design) || !existsSync(join(scriptRoot, "DESIGN.md"))) {
    return { ok: false, skip: "missing-design" };
  }
  const designText = await import("node:fs").then((fs) => fs.readFileSync(design, "utf8"));
  if (!designText.includes("D6365")) {
    return { ok: false, skip: "missing-d6365-decision-log" };
  }

  const { liftUiAssets, viteVueCssAdapter, viteCssModulesAdapter, angularCssAdapter } =
    await loadIngestUiAssets();
  const { verifyUiRouteStyleParity } = await import(
    pathToFileURL(join(scriptRoot, "packages/verify/dist/ui-css-parity.js")).href
  );

  const svelte = liftUiAssets({ buildRoot: svelteFixture });
  if (!svelte.ok) return { ok: false, skip: "svelte-fixture-lift-failed", hole: svelte.hole };
  const vue = liftUiAssets({ buildRoot: vueFixture, adapter: viteVueCssAdapter });
  if (!vue.ok) return { ok: false, skip: "vue-fixture-lift-failed", hole: vue.hole };
  const cssModules = liftUiAssets({ buildRoot: cssModulesFixture, adapter: viteCssModulesAdapter });
  if (!cssModules.ok) return { ok: false, skip: "css-modules-fixture-lift-failed", hole: cssModules.hole };
  const angular = liftUiAssets({ buildRoot: angularFixture, adapter: angularCssAdapter });
  if (!angular.ok) return { ok: false, skip: "angular-fixture-lift-failed", hole: angular.hole };

  const svelteLogin = svelte.bundles.find((b) => b.routeId === "/login");
  const sveltePortal = svelte.bundles.find((b) => b.routeId === "/portal/[tenantId]");
  const isolationOk =
    svelteLogin?.css.includes("#0f1419") === true &&
    svelteLogin?.css.includes("#0fb8a9") === false &&
    sveltePortal?.css.includes("#0fb8a9") === true;

  const vueLogin = vue.bundles.find((b) => b.routeId === "/login");
  const vuePortal = vue.bundles.find((b) => b.routeId === "/portal/login");
  const vueIsolationOk =
    vueLogin?.css.includes("#111827") === true &&
    vueLogin?.css.includes("#0d9488") === false &&
    vuePortal?.css.includes("#0d9488") === true;

  const svelteAll = [...svelte.bundles, ...(svelte.fallbackBundle ? [svelte.fallbackBundle] : [])];
  const vueAll = [...vue.bundles, ...(vue.fallbackBundle ? [vue.fallbackBundle] : [])];
  const svelteParity = verifyUiRouteStyleParity(svelte.map, svelteAll);
  const vueParity = verifyUiRouteStyleParity(vue.map, vueAll);

  const cmLogin = cssModules.bundles.find((b) => b.routeId === "/login");
  const cmPortal = cssModules.bundles.find((b) => b.routeId === "/portal/login");
  const cmIsolationOk =
    cmLogin?.css.includes("#1f2937") === true &&
    cmLogin?.css.includes("#0d9488") === false &&
    cmPortal?.css.includes("#0d9488") === true;
  const cmAll = [...cssModules.bundles, ...(cssModules.fallbackBundle ? [cssModules.fallbackBundle] : [])];
  const cmParity = verifyUiRouteStyleParity(cssModules.map, cmAll);

  const angLogin = angular.bundles.find((b) => b.routeId === "/login");
  const angPortal = angular.bundles.find((b) => b.routeId === "/portal/login");
  const angIsolationOk =
    angLogin?.css.includes("#312e81") === true &&
    angLogin?.css.includes("#7c3aed") === false &&
    angPortal?.css.includes("#7c3aed") === true;
  const angAll = [...angular.bundles, ...(angular.fallbackBundle ? [angular.fallbackBundle] : [])];
  const angParity = verifyUiRouteStyleParity(angular.map, angAll);

  const ok =
    isolationOk === true &&
    vueIsolationOk === true &&
    cmIsolationOk === true &&
    angIsolationOk === true &&
    svelteParity.ok === true &&
    vueParity.ok === true &&
    cmParity.ok === true &&
    angParity.ok === true &&
    svelte.framework === "sveltekit" &&
    vue.framework === "vite-vue" &&
    cssModules.framework === "vite-css-modules" &&
    angular.framework === "angular";

  return {
    kind: HUB_UI_ASSET_LIFT_SMOKE_KIND,
    schemaVersion: HUB_UI_ASSET_LIFT_SMOKE_SCHEMA_VERSION,
    ok,
    svelte: {
      framework: svelte.framework,
      bundles: svelte.bundles.length,
      isolationOk,
      parityOk: svelteParity.ok,
    },
    vue: {
      framework: vue.framework,
      bundles: vue.bundles.length,
      isolationOk: vueIsolationOk,
      parityOk: vueParity.ok,
    },
    cssModules: {
      framework: cssModules.framework,
      bundles: cssModules.bundles.length,
      isolationOk: cmIsolationOk,
      parityOk: cmParity.ok,
    },
    angular: {
      framework: angular.framework,
      bundles: angular.bundles.length,
      isolationOk: angIsolationOk,
      parityOk: angParity.ok,
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function runUiAssetLiftSmoke() {
  const progress = createSmokeProgress("ui-asset-lift");
  const t0 = progress.start("UI asset lift (G9300)");
  const gate = await runUiAssetLiftGate();
  progress.end("UI asset lift (G9300)", gate.ok === true, t0);
  return gate;
}

async function main() {
  const r = await runUiAssetLiftSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-ui-asset-lift-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
