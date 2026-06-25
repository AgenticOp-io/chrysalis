#!/usr/bin/env node
/** WISP full-site integrations charter gate (G7705). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadWispFullSiteCharter } from "./hub-wisp-full-site-charter.mjs";

export const WISP_FULL_SITE_INTEGRATIONS_SMOKE_KIND = "chrysalis.wisp.full-site-integrations-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runWispFullSiteIntegrationsGate(_opts = {}) {
  const loaded = loadWispFullSiteCharter();
  if (!loaded.ok) return { ok: false, charter: loaded };
  const charter = loaded.charter;
  const scenariosPath = join(scriptRoot, charter.fixtureRoot, "wisp-scenarios.v1.json");
  if (!existsSync(scenariosPath)) return { ok: false, skip: "missing-wisp-scenarios" };
  const scenarios = JSON.parse(readFileSync(scenariosPath, "utf8"));
  const ids = new Set((scenarios.scenarios ?? []).map((s) => s.id));
  const required = ["arcgis-mapview", "echarts-monitoring", "backend-mongodb"];
  const chartered = charter.integrationVendorSurfaces ?? [];
  const inventoryOk = required.every((id) => ids.has(id));
  const charterOk =
    chartered.includes("hub-svelte:arcgis-map") && chartered.includes("hub-svelte:chart-component");
  const ok = inventoryOk === true && charterOk === true;
  return {
    kind: WISP_FULL_SITE_INTEGRATIONS_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    inventoryOk,
    charterOk,
    required,
    chartered,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = runWispFullSiteIntegrationsGate();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-full-site-integrations-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
