#!/usr/bin/env node
/** Phase 28b scenario inventory gate (G7802). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const WISP_PRODUCTION_POC_SCENARIO_KIND = "chrysalis.wisp.production-poc-scenario-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runWispProductionPocScenarioGate() {
  const path = join(scriptRoot, "fixtures/hub-wisp-management/wisp-scenarios.v1.json");
  if (!existsSync(path)) return { ok: false, skip: "missing-wisp-scenarios" };
  const json = JSON.parse(readFileSync(path, "utf8"));
  const scenarios = json.scenarios ?? [];
  const byId = Object.fromEntries(scenarios.map((s) => [s.id, s]));
  const firebase = byId["firebase-auth"];
  const backend = byId["backend-mongodb"];
  const inventoryOk =
    json.postG7790 === true &&
    firebase?.conversionStatus === "native-cwl-session" &&
    backend?.conversionStatus === "native-cwl-handlers" &&
    backend?.backendConversion === "native-cwl-handlers";
  const required = ["arcgis-mapview", "echarts-monitoring", "backend-mongodb"];
  const idsOk = required.every((id) => byId[id]);
  const ok = inventoryOk === true && idsOk === true;
  return {
    kind: WISP_PRODUCTION_POC_SCENARIO_KIND,
    schemaVersion: 1,
    ok,
    inventoryOk,
    idsOk,
    postG7790: json.postG7790 === true,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = runWispProductionPocScenarioGate();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-production-poc-scenario-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
