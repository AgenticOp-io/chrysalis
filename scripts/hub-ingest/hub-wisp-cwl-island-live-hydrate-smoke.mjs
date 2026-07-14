#!/usr/bin/env node
/**
 * G9902 — live structural island contract: client + APIs for hydrate targets.
 *
 * Run: pnpm run hub:wisp-cwl-island-live-hydrate-smoke
 * Skip: CHRYSALIS_SKIP_LIVE=1
 */
import { runWispCwlIslandFidelitySmoke } from "./hub-wisp-cwl-island-fidelity-smoke.mjs";

export const WISP_CWL_ISLAND_LIVE_HYDRATE_SMOKE_KIND = "chrysalis.wisp.cwl-island-live-hydrate-smoke";

const DEFAULT_BASE = "http://34.61.255.147:19100";

async function fetchText(url) {
  const res = await fetch(url, { redirect: "follow" });
  const text = await res.text();
  return { status: res.status, text, headers: res.headers };
}

function countItems(json) {
  if (Array.isArray(json)) return json.length;
  if (!json || typeof json !== "object") return 0;
  for (const k of [
    "items",
    "records",
    "hardware",
    "inventory",
    "customers",
    "sites",
    "workOrders",
    "tickets",
    "plans",
    "users",
    "tenants",
    "groups",
    "deployments",
    "devices",
    "modules",
    "rows",
    "data",
    "results",
  ]) {
    if (Array.isArray(json[k])) return json[k].length;
  }
  for (const v of Object.values(json)) {
    if (Array.isArray(v)) return v.length;
  }
  return 0;
}

export async function runWispCwlIslandLiveHydrateSmoke(opts = {}) {
  if (process.env.CHRYSALIS_SKIP_LIVE === "1") {
    return {
      kind: WISP_CWL_ISLAND_LIVE_HYDRATE_SMOKE_KIND,
      schemaVersion: 1,
      ok: true,
      skip: "CHRYSALIS_SKIP_LIVE",
      generatedAt: new Date().toISOString(),
    };
  }

  const local = runWispCwlIslandFidelitySmoke();
  const base = (opts.baseUrl || process.env.CHRYSALIS_WISP_DEMO_URL || DEFAULT_BASE).replace(/\/$/, "");

  const client = await fetchText(`${base}/assets/wisp-cwl-client.js`);
  const liveClientHasMulti =
    client.status === 200 &&
    client.text.includes("initStructuralModulePages") &&
    client.text.includes(".inventory-page") &&
    client.text.includes(".customers-page") &&
    client.text.includes(".work-orders-page") &&
    client.text.includes("initDashboardModules") &&
    client.text.includes("/api/maintain") &&
    client.text.includes("fillPlans") &&
    client.text.includes("/api/users") &&
    client.text.includes("fillDeployCounts");

  const apis = {};
  for (const path of [
    "/api/hardware",
    "/api/inventory",
    "/api/customers",
    "/api/network",
    "/api/work-orders",
    "/api/admin",
    "/api/maintain",
    "/api/customer-billing",
    "/api/users",
    "/api/tenants",
    "/api/monitoring",
    "/api/hss",
    "/api/deploy",
  ]) {
    const r = await fetchText(`${base}${path}`);
    let count = 0;
    let parseOk = false;
    try {
      count = countItems(JSON.parse(r.text));
      parseOk = true;
    } catch {
      parseOk = false;
    }
    apis[path] = {
      status: r.status,
      proxy: r.headers.get("x-chrysalis-wisp-proxy"),
      parseOk,
      itemCount: count,
      ok: r.status === 200 && parseOk && count >= 0 && r.headers.get("x-chrysalis-wisp-proxy") === "cwl-native-api",
    };
  }

  const hardwarePage = await fetchText(`${base}/modules/hardware`);
  const hardwareOk =
    hardwarePage.status === 200 &&
    hardwarePage.headers.get("x-chrysalis-wisp-proxy") === "cwl" &&
    hardwarePage.text.includes("hardware-page") &&
    hardwarePage.text.includes("wisp-cwl-client.js");

  const apisOk = Object.values(apis).every((a) => a.ok);
  const ok = local.ok === true && liveClientHasMulti && apisOk && hardwareOk;

  return {
    kind: WISP_CWL_ISLAND_LIVE_HYDRATE_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    baseUrl: base,
    localOk: local.ok,
    liveClientHasMulti,
    hardwareOk,
    apis,
    note: "Live client dashboard + multi-module islands; CWL-native list APIs for hydrate",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runWispCwlIslandLiveHydrateSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-island-live-hydrate-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
