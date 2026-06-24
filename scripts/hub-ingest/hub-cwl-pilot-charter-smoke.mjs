#!/usr/bin/env node
/** Pilot charter smoke (G7401) — signed slice, hole budget, route manifest. */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPilotCharter, resolvePilotCwlFixture } from "./hub-cwl-pilot-charter.mjs";
import { parseCwlModuleResolved } from "./cwl-module-graph.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_PILOT_CHARTER_SMOKE_KIND = "chrysalis.cwl.pilot-charter-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runCwlPilotCharterDocGate() {
  const programPath = join(scriptRoot, "docs/CWL-CUSTOMER-PILOT-PROGRAM.md");
  const pilotDocPath = join(scriptRoot, "docs/CWL-FULLSTACK-FLAGSHIP-PILOT.md");
  if (!existsSync(programPath) || !existsSync(pilotDocPath)) {
    return { ok: false, skip: "missing-pilot-docs" };
  }
  const program = readFileSync(programPath, "utf8");
  const pilotDoc = readFileSync(pilotDocPath, "utf8");
  const ok =
    program.includes("G7401") &&
    program.includes("pilot-charter") &&
    pilotDoc.includes("hub-flagship-cwl-fullstack");
  return { ok, docOk: ok };
}

export function runCwlPilotCharterGate(_opts = {}) {
  const doc = runCwlPilotCharterDocGate();
  const loaded = loadPilotCharter();
  if (!loaded.ok) {
    return { ok: false, doc, charter: loaded, generatedAt: new Date().toISOString() };
  }
  const charter = loaded.charter;
  const fixture = resolvePilotCwlFixture(charter);
  const budgetPath = join(fixture, charter.holeBudgetFile ?? "chrysalis.fullstack-hole-budget.json");
  const routesPath = join(fixture, charter.routesManifest ?? "chrysalis.routes.json");
  const cwlPath = join(fixture, "routes.cwl");
  let manifestRouteCount = 0;
  if (existsSync(routesPath)) {
    try {
      const routes = JSON.parse(readFileSync(routesPath, "utf8"));
      manifestRouteCount = Array.isArray(routes.routes) ? routes.routes.length : 0;
    } catch {
      manifestRouteCount = 0;
    }
  }
  let parsedRouteCount = 0;
  if (existsSync(cwlPath)) {
    try {
      const src = readFileSync(cwlPath, "utf8");
      parsedRouteCount = parseCwlModuleResolved(src, "routes.cwl", { baseDir: fixture }).routes.length;
    } catch {
      parsedRouteCount = 0;
    }
  }
  const routeCount = Math.max(manifestRouteCount, parsedRouteCount);
  const minRoutes = charter.minInScopeRoutes ?? 8;
  const charterOk =
    existsSync(budgetPath) &&
    routeCount >= minRoutes &&
    Array.isArray(charter.ingestOrigins) &&
    charter.ingestOrigins.length >= 2;
  const ok = doc.ok === true && charterOk;
  return {
    kind: CWL_PILOT_CHARTER_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    doc,
    charter: { ok: true, pilotId: charter.pilotId, routeCount, minRoutes },
    budgetOk: existsSync(budgetPath),
    routesOk: routeCount >= minRoutes,
    generatedAt: new Date().toISOString(),
  };
}

export async function runCwlPilotCharterSmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-pilot-charter");
  const t0 = progress.start("CWL pilot charter (G7401)");
  const gate = runCwlPilotCharterGate(opts);
  progress.end("CWL pilot charter (G7401)", gate.ok === true, t0);
  return { kind: CWL_PILOT_CHARTER_SMOKE_KIND, schemaVersion: 1, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runCwlPilotCharterSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-pilot-charter-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
