#!/usr/bin/env node
/**
 * G9947–G9948 — WISP ArcGIS map honesty + remaining grind (module-access / PCI map host).
 *
 * Run: pnpm run hub:wisp-cwl-arcgis-grind-smoke
 * Skip live: CHRYSALIS_SKIP_LIVE=1
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const WISP_CWL_ARCGIS_GRIND_SMOKE_KIND = "chrysalis.wisp.cwl-arcgis-grind-smoke";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_BASE = "http://34.61.255.147:19100";

async function fetchText(url) {
  const res = await fetch(url, { redirect: "follow" });
  return { status: res.status, text: await res.text(), headers: res.headers };
}

export async function runWispCwlArcgisGrindSmoke(opts = {}) {
  const fixture = join(ROOT, "fixtures/hub-wisp-management");
  const mapJs = existsSync(join(fixture, "wisp-cwl-map.js"))
    ? readFileSync(join(fixture, "wisp-cwl-map.js"), "utf8")
    : "";
  const client = existsSync(join(fixture, "wisp-cwl-client.js"))
    ? readFileSync(join(fixture, "wisp-cwl-client.js"), "utf8")
    : "";
  const proxy = existsSync(join(fixture, "api-proxy.cwl"))
    ? readFileSync(join(fixture, "api-proxy.cwl"), "utf8")
    : "";
  const cfg = existsSync(join(fixture, "wisp-arcgis-config.json"))
    ? readFileSync(join(fixture, "wisp-arcgis-config.json"), "utf8")
    : "";
  const coverageGolden = existsSync(join(fixture, "wisp-api-goldens/GET-api-coverage.golden.json"))
    ? JSON.parse(readFileSync(join(fixture, "wisp-api-goldens/GET-api-coverage.golden.json"), "utf8"))
    : null;
  const networkGolden = existsSync(join(fixture, "wisp-api-goldens/GET-api-network.golden.json"))
    ? JSON.parse(readFileSync(join(fixture, "wisp-api-goldens/GET-api-network.golden.json"), "utf8"))
    : null;
  const chimera = existsSync(join(ROOT, "scripts/lib/cwl-chimera-gateway.mjs"))
    ? readFileSync(join(ROOT, "scripts/lib/cwl-chimera-gateway.mjs"), "utf8")
    : existsSync(join(ROOT, "scripts/wisp-cwl-chimera-gateway.mjs"))
      ? readFileSync(join(ROOT, "scripts/wisp-cwl-chimera-gateway.mjs"), "utf8")
      : "";
  const infer = existsSync(join(ROOT, "packages/ingest/src/infer-ui-page-api-path.ts"))
    ? readFileSync(join(ROOT, "packages/ingest/src/infer-ui-page-api-path.ts"), "utf8")
    : "";
  const routes = existsSync(join(fixture, "routes.cwl"))
    ? readFileSync(join(fixture, "routes.cwl"), "utf8")
    : "";

  const cfgJson = (() => {
    try {
      return JSON.parse(cfg || "{}");
    } catch {
      return {};
    }
  })();
  // Empty apiKey is fine (OSM basemap). Refuse Google Maps-shaped keys.
  const keyOk = !String(cfgJson.apiKey || "").startsWith("AIza");

  const g9947 =
    mapJs.includes("GraphicsLayer") &&
    mapJs.includes("/api/network/sites") &&
    mapJs.includes("/api/network/sectors") &&
    mapJs.includes("loadArcGisApi") &&
    mapJs.includes("wisp-cwl-arcgis.bundle.js") &&
    mapJs.includes("D6441") &&
    mapJs.includes("__WISP_CWL_MAP_RUNTIME__") &&
    !mapJs.includes("js.arcgis.com/4.29/@arcgis/core/") &&
    !mapJs.includes('require(\n') &&
    !/\$require\s*\(\s*\[\s*"esri\//.test(mapJs) &&
    mapJs.includes("OpenStreetMapLayer") &&
    mapJs.includes("latLngOf") &&
    mapJs.includes("ensureHost") &&
    // CWL golden/chimera still charters /api/coverage; live HSS uses /api/network/*.
    (mapJs.includes("/api/coverage") || proxy.includes('@route GET "/api/coverage"')) &&
    keyOk &&
    proxy.includes('@route GET "/api/coverage"') &&
    Array.isArray(coverageGolden?.coverage) &&
    coverageGolden.coverage.some((c) => c.lat != null && c.lng != null) &&
    Array.isArray(networkGolden?.sites) &&
    networkGolden.sites.some((s) => s.lat != null && s.lng != null) &&
    chimera.includes("isPciMap") &&
    chimera.includes("wisp-cwl-arcgis.bundle.js") &&
    infer.includes('["/modules/coverage-map", "/api/coverage"]');

  const g9948 =
    (client.includes(".module-access-container") ||
      client.includes('data-wisp-path="/settings/module-access"') ||
      client.includes("settings_module_access")) &&
    client.includes("fillModuleAccess") &&
    client.includes("/api/module-access") &&
    (client.includes('page: "coverage-map"') ||
      client.includes('data-wisp-page="coverage-map"')) &&
    proxy.includes('@route GET "/api/module-access"') &&
    (routes.includes('data-wisp-path=\\"/settings/module-access\\"') ||
      routes.includes('httpPath: "/settings/module-access"')) &&
    infer.includes('["/settings/module-access", "/api/module-access"]') &&
    (existsSync(join(fixture, "hydrate-samples/api-module-access.json")) ||
      existsSync(join(fixture, "wisp-api-goldens/GET-api-module-access.golden.json")));

  let live = { skipped: true };
  if (process.env.CHRYSALIS_SKIP_LIVE !== "1") {
    const base = (opts.baseUrl || process.env.CHRYSALIS_WISP_DEMO_URL || DEFAULT_BASE).replace(
      /\/$/,
      "",
    );
    const apis = {};
    for (const path of ["/api/network/sites", "/api/network/sectors", "/api/module-access"]) {
      try {
        const r = await fetchText(`${base}${path}`);
        let body = null;
        let parseOk = false;
        try {
          body = JSON.parse(r.text);
          parseOk = true;
        } catch {
          parseOk = false;
        }
        const proxyHdr = r.headers.get("x-chrysalis-wisp-proxy");
        const hasGeom =
          path === "/api/module-access"
            ? Array.isArray(body?.modules) || Array.isArray(body?.items)
            : Boolean(
                body &&
                  ((Array.isArray(body.coverage) && body.coverage.some((c) => c?.lat != null)) ||
                    (Array.isArray(body.sites) && body.sites.some((s) => s?.lat != null)) ||
                    (Array.isArray(body.items) && body.items.some((i) => i?.lat != null))),
              );
        apis[path] = {
          status: r.status,
          proxy: proxyHdr,
          parseOk,
          ok: r.status === 200 && parseOk && proxyHdr === "cwl-native-api",
          hasGeom: path === "/api/module-access" ? Boolean(body?.ok || body?.modules) : hasGeom,
        };
      } catch (e) {
        apis[path] = { ok: false, error: String(e && e.message ? e.message : e) };
      }
    }
    const mapAsset = await fetchText(`${base}/assets/wisp-cwl-map.js`).catch((e) => ({
      status: 0,
      text: "",
      error: String(e),
    }));
    const bundleAsset = await fetchText(`${base}/assets/wisp-cwl-arcgis.bundle.js`).catch((e) => ({
      status: 0,
      text: "",
      error: String(e),
    }));
    live = {
      skipped: false,
      base,
      apis,
      mapJsHasGraphics:
        typeof mapAsset.text === "string" && mapAsset.text.includes("GraphicsLayer"),
      mapJsPrefersBundle:
        typeof mapAsset.text === "string" && mapAsset.text.includes("wisp-cwl-arcgis.bundle.js"),
      arcgisBundleOk:
        typeof bundleAsset.status === "number" &&
        bundleAsset.status === 200 &&
        typeof bundleAsset.text === "string" &&
        bundleAsset.text.length > 1000 &&
        !bundleAsset.text.includes("Only use ES modules from ArcGIS CDN"),
      ok:
        Object.values(apis).every((a) => a && a.ok) &&
        typeof mapAsset.text === "string" &&
        mapAsset.text.includes("GraphicsLayer") &&
        mapAsset.text.includes("wisp-cwl-arcgis.bundle.js") &&
        typeof bundleAsset.status === "number" &&
        bundleAsset.status === 200,
    };
  }

  const ok = g9947 && g9948 && (live.skipped || live.ok === true);

  return {
    kind: WISP_CWL_ARCGIS_GRIND_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    g9947,
    g9948,
    live,
    note:
      "ArcGIS MapView + API geometry overlays; module-access + PCI map host grind — no invented map engine; GenieACS OOS",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runWispCwlArcgisGrindSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-arcgis-grind-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
