#!/usr/bin/env node
/**
 * Smoke: hub-gold-phoenix-controllers Phoenix router + thin Controller → WebIR
 * hole-free (20 routes). Peels get|post|… "/path", Ctrl, :action + json/put_status /
 * params["id"]. Does not replace Plug.Router hub-gold-elixir-plug D6448-ST.
 * Honest holes: live "/…", LiveView, pipelines, resources/scope (D6447).
 * G10126 / D6540 (unparks phoenix-controller-honest-skip at route-table level).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { loadWebir } from "./shared.mjs";
import { summarizeCwlProjection } from "./hub-webir-routes.mjs";

export const HUB_PHOENIX_CONTROLLERS_SMOKE_KIND = "chrysalis.hub.phoenix-controllers-smoke";
export const HUB_PHOENIX_CONTROLLERS_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixture = join(scriptRoot, "fixtures/hub-gold-phoenix-controllers");
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");

const EXPECT_ROUTES = 20;

/**
 * @param {string} [projectDir]
 */
export async function runPhoenixControllersSmoke(projectDir = fixture) {
  const root = resolve(projectDir);
  const routerFile = join(root, "lib", "hub_gold_web", "router.ex");
  if (!existsSync(routerFile)) {
    return {
      kind: HUB_PHOENIX_CONTROLLERS_SMOKE_KIND,
      schemaVersion: HUB_PHOENIX_CONTROLLERS_SMOKE_SCHEMA_VERSION,
      ok: false,
      skip: "missing-router-ex",
      routeCount: 0,
      holeCount: null,
      generatedAt: new Date().toISOString(),
    };
  }

  const source = readFileSync(routerFile, "utf8");
  if (
    !/\b(get|post|put|patch|delete)\s+"[^"]+"\s*,\s*[A-Za-z0-9_.]+\s*,\s*:[A-Za-z_]/.test(
      source,
    )
  ) {
    return {
      kind: HUB_PHOENIX_CONTROLLERS_SMOKE_KIND,
      schemaVersion: HUB_PHOENIX_CONTROLLERS_SMOKE_SCHEMA_VERSION,
      ok: false,
      skip: "not-phoenix-controller-routes",
      routeCount: 0,
      holeCount: null,
      generatedAt: new Date().toISOString(),
    };
  }

  const lift = spawnSync(process.execPath, [liftScript, root, "--language", "elixir"], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  if (lift.status !== 0) {
    return {
      kind: HUB_PHOENIX_CONTROLLERS_SMOKE_KIND,
      schemaVersion: HUB_PHOENIX_CONTROLLERS_SMOKE_SCHEMA_VERSION,
      ok: false,
      skip: "elixir-lift-failed",
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
      kind: HUB_PHOENIX_CONTROLLERS_SMOKE_KIND,
      schemaVersion: HUB_PHOENIX_CONTROLLERS_SMOKE_SCHEMA_VERSION,
      ok: false,
      skip: "lift-json",
      routeCount: 0,
      holeCount: null,
      generatedAt: new Date().toISOString(),
    };
  }

  const webirPath = join(root, ".chrysalis", "hub.elixir.webir.json");
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
    kind: HUB_PHOENIX_CONTROLLERS_SMOKE_KIND,
    schemaVersion: HUB_PHOENIX_CONTROLLERS_SMOKE_SCHEMA_VERSION,
    ok,
    routeCount,
    holeCount,
    gate: "G10126",
    decision: "D6540",
    priorSkip: "phoenix-controller-honest-skip",
    cwlProjection: projection,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runPhoenixControllersSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

if (
  process.argv[1] &&
  /hub-phoenix-controllers-smoke\.mjs$/.test(process.argv[1].replace(/\\/g, "/"))
) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
