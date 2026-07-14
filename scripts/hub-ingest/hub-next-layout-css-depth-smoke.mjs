#!/usr/bin/env node
/**
 * G9940 — Next App Router layout/globals CSS depth without `.next` build.
 *
 * Run: pnpm run hub:next-layout-css-depth-smoke
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const NEXT_LAYOUT_CSS_DEPTH_SMOKE_KIND = "chrysalis.hub.next-layout-css-depth-smoke";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function loadIngest() {
  try {
    return await import("@chrysalis/ingest");
  } catch {
    return import(pathToFileURL(join(ROOT, "packages/ingest/dist/index.js")).href);
  }
}

export async function runNextLayoutCssDepthSmoke() {
  const fixture = join(ROOT, "fixtures/ui-markup-next");
  if (!existsSync(fixture)) {
    return {
      kind: NEXT_LAYOUT_CSS_DEPTH_SMOKE_KIND,
      schemaVersion: 1,
      ok: false,
      skip: "missing-next-fixture",
    };
  }

  const ingest = await loadIngest();
  if (typeof ingest.collectNextLayoutStylesheets !== "function") {
    return {
      kind: NEXT_LAYOUT_CSS_DEPTH_SMOKE_KIND,
      schemaVersion: 1,
      ok: false,
      error: "collectNextLayoutStylesheets not exported — rebuild @chrysalis/ingest",
    };
  }

  const loginPage = join(fixture, "app/login/page.tsx");
  const portalPage = join(fixture, "app/portal/login/page.tsx");

  const loginLayouts = ingest.collectNextLayoutStylesheets(fixture, loginPage);
  const portalLayouts = ingest.collectNextLayoutStylesheets(fixture, portalPage);
  const loginPages = ingest.collectNextPageStylesheets(fixture, loginPage);
  const portalPages = ingest.collectNextPageStylesheets(fixture, portalPage);

  const layoutCollectOk =
    loginLayouts.some((s) => s.endsWith("globals.css")) &&
    !loginLayouts.some((s) => s.includes("portal-shell")) &&
    portalLayouts.some((s) => s.endsWith("globals.css")) &&
    portalLayouts.some((s) => s.includes("portal-shell"));

  const pageCollectOk =
    loginPages.some((s) => s.endsWith("globals.css")) &&
    loginPages.some((s) => s.endsWith("page.module.css")) &&
    !loginPages.some((s) => s.includes("portal-shell")) &&
    portalPages.some((s) => s.includes("portal-shell")) &&
    portalPages.some((s) => s.endsWith("page.module.css"));

  const assets = ingest.liftProjectUiAssets({ projectDir: fixture });
  const assetsOk =
    assets.ok === true &&
    !("skip" in assets && assets.skip) &&
    "framework" in assets &&
    assets.framework === "next-app" &&
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

  const layoutIsolationOk =
    login?.css.includes("--next-root-token") === true &&
    login?.css.includes("--next-portal-token") !== true &&
    portal?.css.includes("--next-root-token") === true &&
    portal?.css.includes("--next-portal-token") === true &&
    login?.css.includes("#111827") === true &&
    portal?.css.includes("#0d9488") === true;

  const fallbackClean =
    assetsOk && "fallbackBundle" in assets
      ? assets.fallbackBundle == null ||
        (assets.fallbackBundle &&
          !String(assets.fallbackBundle.css || "").includes("--next-root-token"))
      : false;

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
    convert.uiAssets.framework === "next-app";

  const ok =
    layoutCollectOk && pageCollectOk && assetsOk && layoutIsolationOk && fallbackClean && convertOk;

  return {
    kind: NEXT_LAYOUT_CSS_DEPTH_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    layoutCollectOk,
    pageCollectOk,
    assetsOk,
    layoutIsolationOk,
    fallbackClean,
    convertOk,
    loginLayouts,
    portalLayouts,
    note: "Next ancestor layout/globals CSS attributed per route without .next; nested layout isolation",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runNextLayoutCssDepthSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-next-layout-css-depth-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
