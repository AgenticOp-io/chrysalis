#!/usr/bin/env node
/**
 * G9949 — SharedMap ↔ ArcGIS coverage-map interaction converted
 * (plan/deploy postMessage protocol from Module_Manager).
 *
 * Run: pnpm run hub:wisp-cwl-map-interact-smoke
 * Skip live: CHRYSALIS_SKIP_LIVE=1
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const WISP_CWL_MAP_INTERACT_SMOKE_KIND = "chrysalis.wisp.cwl-map-interact-smoke";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_BASE = "http://34.61.255.147:19100";

async function fetchText(url) {
  const res = await fetch(url, { redirect: "follow" });
  return { status: res.status, text: await res.text() };
}

export async function runWispCwlMapInteractSmoke(opts = {}) {
  const fixture = join(ROOT, "fixtures/hub-wisp-management");
  const mapJs = existsSync(join(fixture, "wisp-cwl-map.js"))
    ? readFileSync(join(fixture, "wisp-cwl-map.js"), "utf8")
    : "";
  const mods = existsSync(join(fixture, "wisp-cwl-modules.js"))
    ? readFileSync(join(fixture, "wisp-cwl-modules.js"), "utf8")
    : "";

  const mapOk =
    mapJs.includes('source: "coverage-map"') &&
    mapJs.includes("request-state") &&
    mapJs.includes("state-update") &&
    mapJs.includes("enable-rectangle-drawing") &&
    mapJs.includes("center-map-on-location") &&
    mapJs.includes("asset-click") &&
    mapJs.includes("rectangle-drawn") &&
    mapJs.includes("layer-filters-changed") &&
    mapJs.includes("shared-map") &&
    mapJs.includes("plan-page") &&
    mapJs.includes("wispMapController");

  const shellOk =
    mods.includes("postStateToIframe") &&
    mods.includes("shared-map") &&
    mods.includes("enable-rectangle-drawing") &&
    mods.includes("layer-filters-changed") &&
    mods.includes("setActivePlan") &&
    mods.includes('data-wisp-page="deploy"') &&
    mods.includes("handleMapMessage") &&
    mods.includes("wispSharedMap");

  let live = { skipped: true };
  if (process.env.CHRYSALIS_SKIP_LIVE !== "1") {
    const base = (opts.baseUrl || process.env.CHRYSALIS_WISP_DEMO_URL || DEFAULT_BASE).replace(
      /\/$/,
      "",
    );
    const mapAsset = await fetchText(`${base}/assets/wisp-cwl-map.js`);
    const modAsset = await fetchText(`${base}/assets/wisp-cwl-modules.js`);
    live = {
      skipped: false,
      base,
      ok:
        mapAsset.status === 200 &&
        mapAsset.text.includes("enable-rectangle-drawing") &&
        mapAsset.text.includes("request-state") &&
        modAsset.status === 200 &&
        modAsset.text.includes("postStateToIframe") &&
        modAsset.text.includes("wispSharedMap"),
    };
  }

  const ok = mapOk && shellOk && (live.skipped || live.ok === true);
  return {
    kind: WISP_CWL_MAP_INTERACT_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    mapOk,
    shellOk,
    live,
    note:
      "Converted SharedMap↔coverage-map postMessage protocol — plan/deploy drive ArcGIS; no invented discovery/GenieACS",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runWispCwlMapInteractSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-map-interact-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
