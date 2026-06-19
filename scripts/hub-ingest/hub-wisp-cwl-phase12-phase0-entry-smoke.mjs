#!/usr/bin/env node
/** Phase 12 Phase 0 entry smoke (G6304). */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildWispScenarioInventory } from "../wisp-cwl-scenario-inventory.mjs";
import { generateWispApiProxyCwl } from "../wisp-cwl-generate-api-proxy-cwl.mjs";
import { runWispChimeraGatewaySmoke } from "./hub-wisp-cwl-chimera-gateway-smoke.mjs";

export const WISP_CWL_PHASE12_PHASE0_ENTRY_SMOKE_KIND = "chrysalis.wisp-cwl-phase12-phase0-entry-smoke";
export const WISP_CWL_PHASE12_PHASE0_ENTRY_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runWispCwlProgramDocGate() {
  const path = join(scriptRoot, "docs/WISP-CWL-FULLSTACK-PROGRAM.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-wisp-program-doc" };
  const text = readFileSync(path, "utf8");
  const ok =
    text.includes("G6300") &&
    text.includes("wisp-cwl-chimera-gateway") &&
    text.includes("hub-svelte:arcgis-map") &&
    text.includes("acs-hss-server") &&
    text.includes("Backend / GenieACS conversion") &&
    text.includes("Phase 14") &&
    text.includes("G6500") &&
    text.includes("G6510") &&
    text.includes("G6530") &&
    text.includes("G6540") &&
    text.includes("G6600") &&
    text.includes("client redirect") &&
    text.includes("ACS / TR-069 as CWL language goals");
  return { ok, wispProgramDocOk: ok };
}

export function runWispCwlApiPathsManifestGate() {
  const path = join(scriptRoot, "fixtures/hub-wisp-management/wisp-api-paths.json");
  if (!existsSync(path)) return { ok: false, skip: "missing-wisp-api-paths" };
  const json = JSON.parse(readFileSync(path, "utf8"));
  const ok = Array.isArray(json.paths) && json.paths.length >= 20;
  return { ok, pathCount: json.paths?.length ?? 0 };
}

export function runWispCwlScenarioInventoryGate() {
  const path = join(scriptRoot, "fixtures/hub-wisp-management/wisp-scenarios.v1.json");
  const wispRoot = process.env.CHRYSALIS_WISP_ROOT ?? "C:/Users/david/Downloads/WISPTools/Module_Manager";
  const live = buildWispScenarioInventory(wispRoot);
  if (!live.ok) {
    if (existsSync(path)) return { ok: true, skip: "wisp-root-unavailable-used-fixture" };
    return { ok: false, skip: "missing-wisp-root-and-fixture" };
  }
  const ok = live.scenarios.length >= 8 && live.modules.length >= 15;
  return { ok, scenarioCount: live.scenarios.length, moduleCount: live.modules.length };
}

export async function runWispCwlChimeraGatewaySmokeGate() {
  return runWispChimeraGatewaySmoke();
}

export function runWispCwlApiProxyCwlGate() {
  const r = generateWispApiProxyCwl();
  const path = join(scriptRoot, "fixtures/hub-wisp-management/api-proxy.cwl");
  if (!r.ok || !existsSync(path)) return { ok: false, skip: "api-proxy-cwl-generate-failed" };
  const text = readFileSync(path, "utf8");
  const ok = text.includes("hub-cwl:upstream-proxy") && text.includes("/api/plans");
  return { ok, routeEntries: r.routeEntries ?? null };
}

export async function runWispCwlPhase12Phase0EntryGate() {
  const doc = runWispCwlProgramDocGate();
  const apiPaths = runWispCwlApiPathsManifestGate();
  const inventory = runWispCwlScenarioInventoryGate();
  const apiCwl = runWispCwlApiProxyCwlGate();
  const chimera = await runWispCwlChimeraGatewaySmokeGate();
  const ok =
    doc.ok === true &&
    apiPaths.ok === true &&
    inventory.ok === true &&
    apiCwl.ok === true &&
    chimera.ok === true;
  return {
    kind: WISP_CWL_PHASE12_PHASE0_ENTRY_SMOKE_KIND,
    schemaVersion: WISP_CWL_PHASE12_PHASE0_ENTRY_SMOKE_SCHEMA_VERSION,
    ok,
    doc,
    apiPaths,
    inventory,
    apiCwl,
    chimera,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runWispCwlPhase12Phase0EntryGate();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-phase12-phase0-entry-smoke")) main().catch((e) => { console.error(e); process.exit(1); });
