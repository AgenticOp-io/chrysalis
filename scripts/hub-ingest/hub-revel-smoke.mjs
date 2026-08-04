#!/usr/bin/env node
/**
 * Smoke: hub-gold-revel Revel conf/routes + Controller.Action dialect → WebIR
 * hole-free (20 routes). Peels METHOD PATH Controller.Action + RenderJSON /
 * Response.Status / Params.Route|Query.Get. Does not replace Gin D6448-ST.
 * Honest holes: interceptors / filters / OnAppStart / router.GET invent (D6447).
 * G10114 / D6540 (was G10065 skip).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { loadWebir } from "./shared.mjs";
import { summarizeCwlProjection } from "./hub-webir-routes.mjs";

export const HUB_REVEL_SMOKE_KIND = "chrysalis.hub.revel-smoke";
export const HUB_REVEL_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixture = join(scriptRoot, "fixtures/hub-gold-revel");
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");

const EXPECT_ROUTES = 20;

/**
 * @param {string} [projectDir]
 */
export async function runRevelSmoke(projectDir = fixture) {
  const root = resolve(projectDir);
  const routesFile = join(root, "conf", "routes");
  if (!existsSync(routesFile)) {
    return {
      kind: HUB_REVEL_SMOKE_KIND,
      schemaVersion: HUB_REVEL_SMOKE_SCHEMA_VERSION,
      ok: false,
      skip: "missing-conf-routes",
      routeCount: 0,
      holeCount: null,
      generatedAt: new Date().toISOString(),
    };
  }

  const lift = spawnSync(process.execPath, [liftScript, root, "--language", "go"], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  if (lift.status !== 0) {
    return {
      kind: HUB_REVEL_SMOKE_KIND,
      schemaVersion: HUB_REVEL_SMOKE_SCHEMA_VERSION,
      ok: false,
      skip: "go-lift-failed",
      stderr: (lift.stderr || lift.stdout || "").slice(0, 400),
      routeCount: 0,
      holeCount: null,
      generatedAt: new Date().toISOString(),
    };
  }

  let liftReport;
  try {
    liftReport = JSON.parse(lift.stdout.trim().split("\n").pop() ?? "{}");
  } catch {
    return {
      kind: HUB_REVEL_SMOKE_KIND,
      schemaVersion: HUB_REVEL_SMOKE_SCHEMA_VERSION,
      ok: false,
      skip: "lift-json",
      routeCount: 0,
      holeCount: null,
      generatedAt: new Date().toISOString(),
    };
  }

  const webirPath = join(root, ".chrysalis", "hub.go.webir.json");
  const webir = await loadWebir();
  const raw = JSON.parse(readFileSync(webirPath, "utf8"));
  const mod = webir.moduleFromGoldenSnapshot(raw);
  const projection = summarizeCwlProjection(mod);
  const routeCount = liftReport.routeCount ?? liftReport.astRouteCount ?? 0;
  const holeCount = liftReport.holeCount ?? null;
  const ok =
    routeCount === EXPECT_ROUTES &&
    holeCount === 0 &&
    projection.holeFree === projection.total &&
    projection.total >= EXPECT_ROUTES;

  return {
    kind: HUB_REVEL_SMOKE_KIND,
    schemaVersion: HUB_REVEL_SMOKE_SCHEMA_VERSION,
    ok,
    routeCount,
    holeCount,
    gate: "G10114",
    decision: "D6540",
    priorSkip: "G10065",
    cwlProjection: projection,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runRevelSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

if (process.argv[1] && /hub-revel-smoke\.mjs$/.test(process.argv[1].replace(/\\/g, "/"))) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
