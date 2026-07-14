#!/usr/bin/env node
/** G9880 — multi-origin lift program close composite. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runSvelteNativeConvertEntrySmoke } from "./hub-svelte-native-convert-entry-smoke.mjs";
import { runSvelteNativeConvertCloseSmoke } from "./hub-svelte-native-convert-close-smoke.mjs";
import { runSvelteNativeLlmIsSmoke } from "./hub-svelte-native-llm-is-smoke.mjs";
import { runVueStructuralShellSmoke } from "./hub-vue-structural-shell-smoke.mjs";
import { runVueStructuralShellDepthSmoke } from "./hub-vue-structural-shell-depth-smoke.mjs";
import { runVueLoadBindSmoke } from "./hub-vue-load-bind-smoke.mjs";
import { runVueScopedCssDepthSmoke } from "./hub-vue-scoped-css-depth-smoke.mjs";
import { runVueNuxtLayoutCssSmoke } from "./hub-vue-nuxt-layout-css-smoke.mjs";
import { runVueAppShellCssSmoke } from "./hub-vue-app-shell-css-smoke.mjs";
import { runNextStructuralShellDepthSmoke } from "./hub-next-structural-shell-depth-smoke.mjs";
import { runNextRscDepthSmoke } from "./hub-next-rsc-depth-smoke.mjs";
import { runNextCssDepthSmoke } from "./hub-next-css-depth-smoke.mjs";
import { runNextLayoutCssDepthSmoke } from "./hub-next-layout-css-depth-smoke.mjs";
import { runNextLoadingFontSmoke } from "./hub-next-loading-font-smoke.mjs";
import { runAngularStructuralShellDepthSmoke } from "./hub-angular-structural-shell-depth-smoke.mjs";
import { runAngularDiGraphSmoke } from "./hub-angular-di-graph-smoke.mjs";
import { runAngularProvidedInSmoke } from "./hub-angular-provided-in-smoke.mjs";
import { runAngularNgmoduleProvidersSmoke } from "./hub-angular-ngmodule-providers-smoke.mjs";
import { runMultiOriginConvertOrchSmoke } from "./hub-multi-origin-convert-orch-smoke.mjs";

export const MULTI_ORIGIN_LIFT_CLOSE_SMOKE_KIND = "chrysalis.hub.multi-origin-lift-close-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runMultiOriginLiftCloseSmoke() {
  const entry = runSvelteNativeConvertEntrySmoke();
  const convertClose = runSvelteNativeConvertCloseSmoke();
  const llmIs = await runSvelteNativeLlmIsSmoke();
  const vue = await runVueStructuralShellSmoke();
  const vueDepth = await runVueStructuralShellDepthSmoke();
  const vueLoadBind = await runVueLoadBindSmoke();
  const vueCss = await runVueScopedCssDepthSmoke();
  const vueNuxtLayout = await runVueNuxtLayoutCssSmoke();
  const vueAppShell = await runVueAppShellCssSmoke();
  const nextDepth = await runNextStructuralShellDepthSmoke();
  const nextRsc = await runNextRscDepthSmoke();
  const nextCss = await runNextCssDepthSmoke();
  const nextLayoutCss = await runNextLayoutCssDepthSmoke();
  const nextLoadingFont = await runNextLoadingFontSmoke();
  const angularDepth = await runAngularStructuralShellDepthSmoke();
  const angularDi = await runAngularDiGraphSmoke();
  const angularProvidedIn = await runAngularProvidedInSmoke();
  const angularNgModule = await runAngularNgmoduleProvidersSmoke();
  const convertOrch = await runMultiOriginConvertOrchSmoke();
  const ok =
    entry.ok === true &&
    convertClose.ok === true &&
    llmIs.ok === true &&
    vue.ok === true &&
    vueDepth.ok === true &&
    vueLoadBind.ok === true &&
    vueCss.ok === true &&
    vueNuxtLayout.ok === true &&
    vueAppShell.ok === true &&
    nextDepth.ok === true &&
    nextRsc.ok === true &&
    nextCss.ok === true &&
    nextLayoutCss.ok === true &&
    nextLoadingFont.ok === true &&
    angularDepth.ok === true &&
    angularDi.ok === true &&
    angularProvidedIn.ok === true &&
    angularNgModule.ok === true &&
    convertOrch.ok === true;
  return {
    kind: MULTI_ORIGIN_LIFT_CLOSE_SMOKE_KIND,
    schemaVersion: 4,
    ok,
    entry,
    convertClose,
    llmIs: { ok: llmIs.ok, shorthandCount: llmIs.shorthandCount, domainId: llmIs.isRouting?.domainId },
    vue: { ok: vue.ok, framework: vue.framework, bundleCount: vue.bundleCount },
    vueDepth: {
      ok: vueDepth.ok,
      holeReasons: vueDepth.holeReasons,
      holeCount: vueDepth.holeCount,
    },
    vueLoadBind: { ok: vueLoadBind.ok, hydrateOk: vueLoadBind.hydrateOk },
    vueCss: { ok: vueCss.ok, isolationOk: vueCss.isolationOk },
    vueNuxtLayout: {
      ok: vueNuxtLayout.ok,
      isolationOk: vueNuxtLayout.isolationOk,
    },
    vueAppShell: { ok: vueAppShell.ok, shellOk: vueAppShell.shellOk },
    nextDepth: {
      ok: nextDepth.ok,
      holeReasons: nextDepth.holeReasons,
      holeCount: nextDepth.holeCount,
      staticOk: nextDepth.staticOk,
    },
    nextRsc: { ok: nextRsc.ok, rscOk: nextRsc.rscOk, hydrateOk: nextRsc.hydrateOk },
    nextCss: { ok: nextCss.ok, isolationOk: nextCss.isolationOk },
    nextLayoutCss: {
      ok: nextLayoutCss.ok,
      layoutIsolationOk: nextLayoutCss.layoutIsolationOk,
      fallbackClean: nextLayoutCss.fallbackClean,
    },
    nextLoadingFont: {
      ok: nextLoadingFont.ok,
      companionOk: nextLoadingFont.companionOk,
      convertOk: nextLoadingFont.convertOk,
    },
    angularDepth: {
      ok: angularDepth.ok,
      holeReasons: angularDepth.holeReasons,
      holeCount: angularDepth.holeCount,
      diOk: angularDepth.diOk,
    },
    angularDi: {
      ok: angularDi.ok,
      nodes: angularDi.nodes,
      edgeCount: Array.isArray(angularDi.edges) ? angularDi.edges.length : 0,
    },
    angularProvidedIn: {
      ok: angularProvidedIn.ok,
      providedInOk: angularProvidedIn.providedInOk,
      providersOk: angularProvidedIn.providersOk,
    },
    angularNgModule: {
      ok: angularNgModule.ok,
      ngOk: angularNgModule.ngOk,
      convertOk: angularNgModule.convertOk,
    },
    convertOrch: {
      ok: convertOrch.ok,
      projects: convertOrch.projects,
    },
    docs: [
      "docs/SVELTE-CWL-CONVERSION-LESSONS.md",
      "docs/MULTI-ORIGIN-LIFT-EXPANSION.md",
    ],
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runMultiOriginLiftCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-multi-origin-lift-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
