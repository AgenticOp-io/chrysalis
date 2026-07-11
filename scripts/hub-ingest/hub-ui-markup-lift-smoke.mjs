#!/usr/bin/env node
/** UI markup lift + CWL apply close smoke (G9306–G9309). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_UI_MARKUP_LIFT_SMOKE_KIND = "chrysalis.hub.ui-markup-lift-smoke";
export const HUB_UI_MARKUP_LIFT_SMOKE_SCHEMA_VERSION = 3;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const svelteFixture = join(scriptRoot, "fixtures/ui-markup-svelte");
const vueFixture = join(scriptRoot, "fixtures/ui-markup-vue");
const angularFixture = join(scriptRoot, "fixtures/ui-markup-angular");

async function loadIngestMarkup() {
  const dist = join(scriptRoot, "packages/ingest/dist/index.js");
  if (!existsSync(dist)) {
    throw new Error("packages/ingest/dist/index.js missing — run pnpm --filter @chrysalis/ingest build");
  }
  return import(pathToFileURL(dist).href);
}

async function loadEmitShared() {
  const dist = join(scriptRoot, "packages/emit-shared/dist/index.js");
  if (!existsSync(dist)) {
    throw new Error("packages/emit-shared/dist/index.js missing — run pnpm --filter @chrysalis/emit-shared build");
  }
  return import(pathToFileURL(dist).href);
}

/** G9306–G9309 — markup lift (svelte/vue/angular) + CWL patch. */
export async function runUiMarkupLiftGate() {
  const ingest = await loadIngestMarkup();
  const emitShared = await loadEmitShared();
  const { verifyUiRouteMarkupParity } = await import(
    pathToFileURL(join(scriptRoot, "packages/verify/dist/ui-markup-parity.js")).href
  );

  const svelte = ingest.liftUiMarkup({ buildRoot: svelteFixture, adapter: ingest.svelteKitMarkupAdapter });
  if (!svelte.ok) return { ok: false, skip: "svelte-markup-fixture-lift-failed", hole: svelte.hole };
  const vue = ingest.liftUiMarkup({ buildRoot: vueFixture, adapter: ingest.viteVueMarkupAdapter });
  if (!vue.ok) return { ok: false, skip: "vue-markup-fixture-lift-failed", hole: vue.hole };
  const angular = ingest.liftUiMarkup({ buildRoot: angularFixture, adapter: ingest.angularMarkupAdapter });
  if (!angular.ok) return { ok: false, skip: "angular-markup-fixture-lift-failed", hole: angular.hole };

  const svelteLogin = svelte.bundles.find((b) => b.routeId === "/login");
  const sveltePortal = svelte.bundles.find((b) => b.routeId === "/portal/login");
  const svelteIsolationOk =
    svelteLogin?.html.includes("Sign in") === true &&
    svelteLogin?.html.includes("Portal Sign in") === false &&
    sveltePortal?.html.includes("Portal Sign in") === true;

  const vueLogin = vue.bundles.find((b) => b.routeId === "/login");
  const vuePortal = vue.bundles.find((b) => b.routeId === "/portal/login");
  const vueIsolationOk =
    vueLogin?.html.includes("Vue Sign in") === true &&
    vuePortal?.html.includes("Vue Portal Sign in") === true;

  const angLogin = angular.bundles.find((b) => b.routeId === "/login");
  const angPortal = angular.bundles.find((b) => b.routeId === "/portal/login");
  const angIsolationOk =
    angLogin?.html.includes("Angular Sign in") === true &&
    angPortal?.html.includes("Angular Portal Sign in") === true;

  const svelteParity = verifyUiRouteMarkupParity(svelte.map, svelte.bundles);
  const vueParity = verifyUiRouteMarkupParity(vue.map, vue.bundles);
  const angParity = verifyUiRouteMarkupParity(angular.map, angular.bundles);

  const sampleCwl = `@page GET "/login"
{
  return html "<div>stub</div>";
}

@page GET "/portal/login"
{
  return html "<div>stub portal</div>";
}
`;
  const cwlPatch = emitShared.applyLiftedMarkupToCwlSource(sampleCwl, svelte.map, svelte.bundles);
  const cwlApplyOk = cwlPatch.routesPatched === 2 && cwlPatch.text.includes("Sign in") && !cwlPatch.text.includes("stub portal");

  // G9460 / D6367 — structural-shell lifts dynamic pages that static mode skips
  const shell = ingest.liftUiMarkup({
    buildRoot: svelteFixture,
    adapter: ingest.svelteKitMarkupAdapter,
    mode: "structural-shell",
  });
  if (!shell.ok) return { ok: false, skip: "svelte-structural-shell-lift-failed", hole: shell.hole };
  const dash = shell.bundles.find((b) => b.routeId === "/dashboard");
  const structuralOk =
    shell.bundles.length >= 3 &&
    dash?.liftMode === "structural-shell" &&
    dash?.html.includes("dashboard-shell") === true &&
    dash?.html.includes('data-cwl-hole="legacy:markup-lift-svelte-component"') === true &&
    (dash?.holes?.length ?? 0) > 0;

  const ok =
    svelteIsolationOk === true &&
    vueIsolationOk === true &&
    angIsolationOk === true &&
    svelteParity.ok === true &&
    vueParity.ok === true &&
    angParity.ok === true &&
    cwlApplyOk === true &&
    structuralOk === true;

  return {
    kind: HUB_UI_MARKUP_LIFT_SMOKE_KIND,
    schemaVersion: HUB_UI_MARKUP_LIFT_SMOKE_SCHEMA_VERSION,
    ok,
    svelte: { framework: svelte.framework, bundles: svelte.bundles.length, isolationOk: svelteIsolationOk, parityOk: svelteParity.ok },
    vue: { framework: vue.framework, bundles: vue.bundles.length, isolationOk: vueIsolationOk, parityOk: vueParity.ok },
    angular: { framework: angular.framework, bundles: angular.bundles.length, isolationOk: angIsolationOk, parityOk: angParity.ok },
    cwlApply: { routesPatched: cwlPatch.routesPatched, ok: cwlApplyOk },
    structuralShell: {
      bundles: shell.bundles.length,
      dashboardLiftMode: dash?.liftMode ?? null,
      holes: dash?.holes?.length ?? 0,
      ok: structuralOk,
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function runUiMarkupLiftSmoke() {
  const progress = createSmokeProgress("ui-markup-lift");
  const t0 = progress.start("UI markup lift (G9306–G9309)");
  const gate = await runUiMarkupLiftGate();
  progress.end("UI markup lift (G9306–G9309)", gate.ok === true, t0);
  return gate;
}

async function main() {
  const r = await runUiMarkupLiftSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-ui-markup-lift-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
