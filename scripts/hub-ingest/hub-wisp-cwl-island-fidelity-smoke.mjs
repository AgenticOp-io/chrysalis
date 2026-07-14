#!/usr/bin/env node
/**
 * G9900/G9902 — CWL native island/event fidelity (multi-module structural hydrate).
 *
 * Run: pnpm run hub:wisp-cwl-island-fidelity-smoke
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const WISP_CWL_ISLAND_FIDELITY_SMOKE_KIND = "chrysalis.wisp.cwl-island-fidelity-smoke";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const CLIENT = join(ROOT, "fixtures", "hub-wisp-management", "wisp-cwl-client.js");
const GATEWAY = join(ROOT, "scripts", "wisp-cwl-chimera-gateway.mjs");
const EXPORT = join(ROOT, "fixtures", "hub-wisp-management", "cwl-static-export", "modules");

function readExport(rel) {
  const p = join(EXPORT, rel);
  return existsSync(p) ? readFileSync(p, "utf8") : "";
}

export function runWispCwlIslandFidelitySmoke() {
  const clientOk = existsSync(CLIENT);
  const client = clientOk ? readFileSync(CLIENT, "utf8") : "";
  const hasStructuralInit = client.includes("initStructuralModulePages");
  const hasIslandAttr = client.includes("data-cwl-island");
  const hasMultiModule =
    client.includes(".inventory-page") &&
    client.includes(".customers-page") &&
    client.includes(".sites-page") &&
    client.includes(".work-orders-page") &&
    client.includes(".help-desk-container") &&
    client.includes(".billing-module") &&
    client.includes("/api/inventory") &&
    client.includes("/api/customers") &&
    client.includes("/api/hardware") &&
    client.includes("/api/network") &&
    client.includes("/api/work-orders") &&
    client.includes("/api/maintain") &&
    client.includes("/api/customer-billing");
  const hasDashboard = client.includes("initDashboardModules");
  const hasPathApi = client.includes("/modules/hardware") && client.includes("pathApi");
  const hasRefreshBind = /Refresh\|Reload\|Scan Lookup/.test(client);
  const hasReloadHook = client.includes("__wispReloadStructuralModule");

  const gatewayOk = existsSync(GATEWAY);
  const gateway = gatewayOk ? readFileSync(GATEWAY, "utf8") : "";
  const gatewayInjectsClient = gateway.includes("wisp-cwl-client.js");

  const hardwareHtml = readExport("hardware/index.html");
  const inventoryHtml = readExport("inventory/index.html");
  const customersHtml = readExport("customers/index.html");
  const sitesHtml = readExport("sites/index.html");
  const workOrdersHtml = readExport("work-orders/index.html");
  const helpDeskHtml = readExport("help-desk/index.html");
  const billingHtml = readExport("billing/index.html");
  const hardwarePageOk = hardwareHtml.includes("hardware-page");
  const hardwareCssOk =
    hardwareHtml.includes("original-css/modules_hardware.css") ||
    hardwareHtml.includes("modules_hardware.css");
  const inventoryPageOk = inventoryHtml.includes("inventory-page");
  const customersPageOk = customersHtml.includes("customers-page");
  const sitesPageOk = sitesHtml.includes("sites-page");
  const workOrdersPageOk = workOrdersHtml.includes("work-orders-page");
  const helpDeskPageOk = helpDeskHtml.includes("help-desk-container");
  const billingPageOk = billingHtml.includes("billing-module");

  const ok =
    clientOk &&
    hasStructuralInit &&
    hasIslandAttr &&
    hasMultiModule &&
    hasDashboard &&
    hasPathApi &&
    hasRefreshBind &&
    hasReloadHook &&
    gatewayInjectsClient &&
    hardwarePageOk &&
    hardwareCssOk &&
    inventoryPageOk &&
    customersPageOk &&
    sitesPageOk &&
    workOrdersPageOk &&
    helpDeskPageOk &&
    billingPageOk;

  return {
    kind: WISP_CWL_ISLAND_FIDELITY_SMOKE_KIND,
    schemaVersion: 4,
    ok,
    clientOk,
    hasStructuralInit,
    hasIslandAttr,
    hasMultiModule,
    hasDashboard,
    hasPathApi,
    hasRefreshBind,
    hasReloadHook,
    gatewayInjectsClient,
    hardwarePageOk,
    hardwareCssOk,
    inventoryPageOk,
    customersPageOk,
    sitesPageOk,
    workOrdersPageOk,
    helpDeskPageOk,
    billingPageOk,
    note: "Structural islands hydrate core modules + help-desk/billing; path API overrides wrong traced apiPath",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = runWispCwlIslandFidelitySmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-island-fidelity-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
