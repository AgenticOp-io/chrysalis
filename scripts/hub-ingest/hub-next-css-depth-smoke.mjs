#!/usr/bin/env node
/**
 * G9930 — Next App Router CSS depth: co-located page.module.css without `.next` build.
 *
 * Run: pnpm run hub:next-css-depth-smoke
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const NEXT_CSS_DEPTH_SMOKE_KIND = "chrysalis.hub.next-css-depth-smoke";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function loadIngest() {
  try {
    return await import("@chrysalis/ingest");
  } catch {
    return import(pathToFileURL(join(ROOT, "packages/ingest/dist/index.js")).href);
  }
}

export async function runNextCssDepthSmoke() {
  const fixture = join(ROOT, "fixtures/ui-markup-next");
  if (!existsSync(fixture)) {
    return { kind: NEXT_CSS_DEPTH_SMOKE_KIND, schemaVersion: 1, ok: false, skip: "missing-next-fixture" };
  }

  const ingest = await loadIngest();

  const descopeOk =
    ingest.descopeNextCssSelector("._login-page_a1b2c3") === ".login-page" &&
    ingest.descopeNextCssSelector(".login-card") === ".login-card";

  const loginPage = join(fixture, "app/login/page.tsx");
  const collected = ingest.collectNextPageStylesheets(fixture, loginPage);
  const collectOk = collected.some((s) => s.endsWith("page.module.css"));

  const assets = ingest.liftProjectUiAssets({ projectDir: fixture });
  const assetsOk =
    assets.ok === true &&
    !("skip" in assets && assets.skip) &&
    "framework" in assets &&
    assets.framework === "next-app" &&
    "bundles" in assets &&
    Array.isArray(assets.bundles) &&
    assets.bundles.length >= 2;

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
    convert.uiAssets.framework === "next-app";

  const ok = descopeOk && collectOk && assetsOk && isolationOk && convertOk;

  return {
    kind: NEXT_CSS_DEPTH_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    descopeOk,
    collectOk,
    assetsOk,
    isolationOk,
    convertOk,
    routes: assetsOk && "bundles" in assets ? assets.bundles.map((b) => b.routeId).sort() : [],
    note: "Next co-located CSS modules lift without a .next build — same convert-site path",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runNextCssDepthSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-next-css-depth-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
