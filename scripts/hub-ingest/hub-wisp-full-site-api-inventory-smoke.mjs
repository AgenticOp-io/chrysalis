#!/usr/bin/env node
/** WISP full-site API inventory baseline (G7702 inventory slice). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadWispFullSiteCharter } from "./hub-wisp-full-site-charter.mjs";

export const WISP_FULL_SITE_API_INVENTORY_SMOKE_KIND = "chrysalis.wisp.full-site-api-inventory-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runWispFullSiteApiInventoryGate(_opts = {}) {
  const loaded = loadWispFullSiteCharter();
  if (!loaded.ok) return { ok: false, charter: loaded };
  const charter = loaded.charter;
  const apiPathsPath = join(scriptRoot, charter.fixtureRoot, "wisp-api-paths.json");
  const proxyPath = join(scriptRoot, charter.fixtureRoot, "api-proxy.cwl");
  if (!existsSync(apiPathsPath) || !existsSync(proxyPath)) {
    return { ok: false, skip: "missing-wisp-api-inventory" };
  }
  const apiPaths = JSON.parse(readFileSync(apiPathsPath, "utf8"));
  const proxyText = readFileSync(proxyPath, "utf8");
  const prefixCount = Array.isArray(apiPaths.paths) ? apiPaths.paths.length : 0;
  const proxyRouteCount = (proxyText.match(/^@route /gm) ?? []).length;
  const upstreamProxyRefs = (proxyText.match(/hub-cwl:upstream-proxy/g) ?? []).length;
  const inventoryOk =
    prefixCount >= (charter.apiPathPrefixMin ?? 20) &&
    proxyRouteCount >= (charter.apiProxyRouteMin ?? 100);
  const nativeOk = upstreamProxyRefs === 0;
  const ok = inventoryOk === true;
  return {
    kind: WISP_FULL_SITE_API_INVENTORY_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    inventoryOk,
    nativeOk,
    prefixCount,
    proxyRouteCount,
    upstreamProxyRefs,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = runWispFullSiteApiInventoryGate();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-full-site-api-inventory-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
