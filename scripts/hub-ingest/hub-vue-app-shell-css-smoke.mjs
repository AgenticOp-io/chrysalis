#!/usr/bin/env node
/**
 * G9946 — Vue/Nuxt app.vue shell CSS attributed with layouts.
 *
 * Run: pnpm run hub:vue-app-shell-css-smoke
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const VUE_APP_SHELL_CSS_SMOKE_KIND = "chrysalis.hub.vue-app-shell-css-smoke";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function loadIngest() {
  try {
    return await import("@chrysalis/ingest");
  } catch {
    return import(pathToFileURL(join(ROOT, "packages/ingest/dist/index.js")).href);
  }
}

export async function runVueAppShellCssSmoke() {
  const fixture = join(ROOT, "fixtures/ui-markup-vue");
  if (!existsSync(join(fixture, "src/App.vue"))) {
    return {
      kind: VUE_APP_SHELL_CSS_SMOKE_KIND,
      schemaVersion: 1,
      ok: false,
      skip: "missing-vue-app-shell",
    };
  }

  const ingest = await loadIngest();
  const loginPage = join(fixture, "src/views/login.vue");
  const portalPage = join(fixture, "src/views/portal/login.vue");
  const loginSheets = ingest.collectVueLayoutStylesheets(fixture, loginPage);
  const portalSheets = ingest.collectVueLayoutStylesheets(fixture, portalPage);

  const collectOk =
    loginSheets.some((s) => s.endsWith("App.vue")) &&
    portalSheets.some((s) => s.endsWith("App.vue")) &&
    loginSheets.some((s) => s.includes("layouts/default.vue")) &&
    portalSheets.some((s) => s.includes("layouts/portal.vue"));

  const assets = ingest.liftProjectUiAssets({ projectDir: fixture });
  const bundles =
    assets.ok && "bundles" in assets && Array.isArray(assets.bundles) ? assets.bundles : [];
  const login = bundles.find((b) => b.routeId === "/login");
  const portal = bundles.find((b) => b.routeId === "/portal/login");

  const shellOk =
    login?.css.includes("--vue-app-shell-token") === true &&
    portal?.css.includes("--vue-app-shell-token") === true &&
    login?.css.includes("--vue-layout-token") === true &&
    portal?.css.includes("--vue-portal-layout-token") === true &&
    login?.css.includes("--vue-portal-layout-token") !== true;

  const ok = collectOk && shellOk;

  return {
    kind: VUE_APP_SHELL_CSS_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    collectOk,
    shellOk,
    loginSheets,
    portalSheets,
    note: "Vue App.vue shell CSS shared across layouted pages; portal layout isolation preserved",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runVueAppShellCssSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-vue-app-shell-css-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
