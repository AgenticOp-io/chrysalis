#!/usr/bin/env node
/**
 * G9951 — Module_Manager depth: auth'd map network load, controls/filters,
 * dashboard+/modules discoverability, PCI/Frequency, marketing discover,
 * inventory scan/transfer, customer add.
 *
 * Run: pnpm run hub:wisp-cwl-module-depth-smoke
 * Skip live: CHRYSALIS_SKIP_LIVE=1
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const WISP_CWL_MODULE_DEPTH_SMOKE_KIND = "chrysalis.wisp.cwl-module-depth-smoke";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_BASE = "http://34.61.255.147:19100";

function hasAttr(haystack, attr, value) {
  return haystack.includes(`${attr}=\\"${value}\\"`) || haystack.includes(`${attr}="${value}"`);
}

async function fetchText(url) {
  const res = await fetch(url, { redirect: "follow" });
  return { status: res.status, text: await res.text() };
}

export async function runWispCwlModuleDepthSmoke(opts = {}) {
  const fixture = join(ROOT, "fixtures/hub-wisp-management");
  const mapJs = existsSync(join(fixture, "wisp-cwl-map.js"))
    ? readFileSync(join(fixture, "wisp-cwl-map.js"), "utf8")
    : "";
  const mods = existsSync(join(fixture, "wisp-cwl-modules.js"))
    ? readFileSync(join(fixture, "wisp-cwl-modules.js"), "utf8")
    : "";
  const client = existsSync(join(fixture, "wisp-cwl-client.js"))
    ? readFileSync(join(fixture, "wisp-cwl-client.js"), "utf8")
    : "";
  const routes = existsSync(join(fixture, "routes.cwl"))
    ? readFileSync(join(fixture, "routes.cwl"), "utf8")
    : "";
  const sites = existsSync(join(fixture, "wisp-api-goldens/GET-api-network-sites.golden.json"))
    ? JSON.parse(readFileSync(join(fixture, "wisp-api-goldens/GET-api-network-sites.golden.json"), "utf8"))
    : null;
  const sectors = existsSync(join(fixture, "wisp-api-goldens/GET-api-network-sectors.golden.json"))
    ? JSON.parse(readFileSync(join(fixture, "wisp-api-goldens/GET-api-network-sectors.golden.json"), "utf8"))
    : null;

  const mapOk =
    mapJs.includes("WispCwlApi") &&
    mapJs.includes("/api/network/sites") &&
    mapJs.includes("/api/network/sectors") &&
    mapJs.includes("createSectorCone") &&
    mapJs.includes("cwl-map-controls") &&
    mapJs.includes("loadNetworkData");

  const modulesOk =
    mods.includes("openPciModal") &&
    mods.includes("/api/plans/marketing/discover") &&
    mods.includes("showNetworkAssets") &&
    mods.includes("loadSitesAndSectors");

  const clientOk =
    client.includes("openInventoryScanModal") &&
    client.includes("/api/inventory/scan/lookup") &&
    client.includes("openCustomerEditorModal") &&
    client.includes("/api/inventory/transfer");

  const navOk =
    (routes.includes("coverage-map") && routes.includes("wisp-secondary")) ||
    (routes.includes("Coverage Map") && routes.includes("/modules/coverage-map"));

  const modulesIndexOk =
    routes.includes("wisp-modules-index") ||
    hasAttr(routes, "data-wisp-page", "modules");

  const dataOk =
    Array.isArray(sites?.sites) &&
    sites.sites.some((s) => s.lat != null || s.location?.latitude != null) &&
    Array.isArray(sectors?.sectors) &&
    sectors.sectors.some((s) => s.azimuth != null);

  let live = { skipped: true };
  if (process.env.CHRYSALIS_SKIP_LIVE !== "1") {
    const base = (opts.baseUrl || process.env.CHRYSALIS_WISP_DEMO_URL || DEFAULT_BASE).replace(
      /\/$/,
      "",
    );
    const dash = await fetchText(`${base}/dashboard`);
    const modules = await fetchText(`${base}/modules`);
    const mapAsset = await fetchText(`${base}/assets/wisp-cwl-map.js`);
    const sitesApi = await fetchText(`${base}/api/network/sites`);
    live = {
      skipped: false,
      base,
      ok:
        dash.text.includes("/modules/coverage-map") &&
        (modules.text.includes("Module Manager") || modules.text.includes("wisp-modules-index") || modules.text.includes("/modules/plan")) &&
        mapAsset.text.includes("/api/network/sites") &&
        mapAsset.text.includes("WispCwlApi") &&
        sitesApi.text.includes("North Tower"),
    };
  }

  const ok =
    mapOk &&
    modulesOk &&
    clientOk &&
    navOk &&
    modulesIndexOk &&
    dataOk &&
    (live.skipped || live.ok === true);

  return {
    kind: WISP_CWL_MODULE_DEPTH_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    mapOk,
    modulesOk,
    clientOk,
    navOk,
    modulesIndexOk,
    dataOk,
    live,
    note:
      "G9951 Module_Manager depth: auth'd /api/network/* map load, filters/controls, PCI/Frequency, discoverability, scan/transfer/customer",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runWispCwlModuleDepthSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-module-depth-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
