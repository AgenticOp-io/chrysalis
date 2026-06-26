#!/usr/bin/env node
/** Phase 28c integration client UI gate (G7804). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPhase28gIntegrationAnchors } from "../wisp-cwl-apply-phase28g-integrations-ui.mjs";

export const WISP_PRODUCTION_POC_INTEGRATIONS_KIND = "chrysalis.wisp.production-poc-integrations-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runWispProductionPocIntegrationsGate() {
  const routesPath = join(scriptRoot, "fixtures/hub-wisp-management/routes.cwl");
  if (!existsSync(routesPath)) return { ok: false, skip: "missing-routes-cwl" };
  const text = readFileSync(routesPath, "utf8");
  const anchors = buildPhase28gIntegrationAnchors();
  const missing = anchors.filter((a) => !text.includes(`@page GET "${a.path}"`) || !text.includes("wisp-integration-shell"));
  const vendorOk =
    text.includes("wisp-vendor-surface") &&
    text.includes("arcgis-map-host") &&
    text.includes("monitor-charts");
  const ok = missing.length === 0 && vendorOk === true;
  return {
    kind: WISP_PRODUCTION_POC_INTEGRATIONS_KIND,
    schemaVersion: 1,
    ok,
    anchorCount: anchors.length,
    missingPaths: missing.map((m) => m.path),
    vendorOk,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = runWispProductionPocIntegrationsGate();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-production-poc-integrations-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
