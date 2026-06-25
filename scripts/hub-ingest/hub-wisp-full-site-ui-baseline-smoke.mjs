#!/usr/bin/env node
/** WISP full-site UI baseline inventory (G7703 baseline slice). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadWispFullSiteCharter } from "./hub-wisp-full-site-charter.mjs";
import { buildWispHoleManifest } from "../wisp-cwl-hole-manifest.mjs";

export const WISP_FULL_SITE_UI_BASELINE_SMOKE_KIND = "chrysalis.wisp.full-site-ui-baseline-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runWispFullSiteUiBaselineGate(_opts = {}) {
  const loaded = loadWispFullSiteCharter();
  if (!loaded.ok) return { ok: false, charter: loaded };
  const charter = loaded.charter;
  const routesPath = join(scriptRoot, charter.fixtureRoot, "routes.cwl");
  if (!existsSync(routesPath)) return { ok: false, skip: "missing-routes-cwl" };
  const text = readFileSync(routesPath, "utf8");
  const routeCount = (text.match(/^@(route|page) /gm) ?? []).length;
  const pageComponentRefs = (text.match(/hub-svelte:page-component/g) ?? []).length;
  const manifestPath = join(scriptRoot, charter.fixtureRoot, "wisp-hole-manifest.v1.json");
  const manifest = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, "utf8"))
    : buildWispHoleManifest();
  const uiHoleCount = manifest.totalUiHoles ?? manifest.uiHoleCount ?? null;
  const pageComponentHoles = manifest.byReason?.["hub-svelte:page-component"] ?? 0;
  const nativeUiPages = (text.match(/return ui \{/g) ?? []).length;
  const inventoryOk = routeCount >= (charter.uiRouteMin ?? 87);
  const nativeOk = pageComponentRefs === 0 && pageComponentHoles === 0;
  const ok = inventoryOk === true;
  return {
    kind: WISP_FULL_SITE_UI_BASELINE_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    inventoryOk,
    nativeOk,
    routeCount,
    pageComponentRefs,
    pageComponentHoles,
    nativeUiPages,
    uiHoleCount,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = runWispFullSiteUiBaselineGate();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-full-site-ui-baseline-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
