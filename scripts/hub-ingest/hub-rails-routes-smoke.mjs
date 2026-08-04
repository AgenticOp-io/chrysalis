#!/usr/bin/env node
/**
 * Smoke: hub-gold-rails-routes Rails routes.rb + thin ActionController → WebIR
 * hole-free (20 routes). Peels get|post|… "/path", to: "ctrl#action" +
 * render json: / params[:id]. Does not replace Sinatra hub-flagship-ruby D6448-ST.
 * Honest holes: resources/namespace/scope, filters, views, ActiveRecord (D6447).
 * G10115 / D6540 (unparks G10006 at route-table level).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { loadWebir } from "./shared.mjs";
import { summarizeCwlProjection } from "./hub-webir-routes.mjs";

export const HUB_RAILS_ROUTES_SMOKE_KIND = "chrysalis.hub.rails-routes-smoke";
export const HUB_RAILS_ROUTES_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixture = join(scriptRoot, "fixtures/hub-gold-rails-routes");
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");

const EXPECT_ROUTES = 20;

/**
 * @param {string} [projectDir]
 */
export async function runRailsRoutesSmoke(projectDir = fixture) {
  const root = resolve(projectDir);
  const routesFile = join(root, "config", "routes.rb");
  if (!existsSync(routesFile)) {
    return {
      kind: HUB_RAILS_ROUTES_SMOKE_KIND,
      schemaVersion: HUB_RAILS_ROUTES_SMOKE_SCHEMA_VERSION,
      ok: false,
      skip: "missing-routes-rb",
      routeCount: 0,
      holeCount: null,
      generatedAt: new Date().toISOString(),
    };
  }

  const source = readFileSync(routesFile, "utf8");
  if (!/Rails\.application\.routes\.draw/.test(source) || !/\bto:\s*['"]/.test(source)) {
    return {
      kind: HUB_RAILS_ROUTES_SMOKE_KIND,
      schemaVersion: HUB_RAILS_ROUTES_SMOKE_SCHEMA_VERSION,
      ok: false,
      skip: "not-rails-routes-draw",
      routeCount: 0,
      holeCount: null,
      generatedAt: new Date().toISOString(),
    };
  }

  const lift = spawnSync(process.execPath, [liftScript, root, "--language", "ruby"], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  if (lift.status !== 0) {
    return {
      kind: HUB_RAILS_ROUTES_SMOKE_KIND,
      schemaVersion: HUB_RAILS_ROUTES_SMOKE_SCHEMA_VERSION,
      ok: false,
      skip: "ruby-lift-failed",
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
      kind: HUB_RAILS_ROUTES_SMOKE_KIND,
      schemaVersion: HUB_RAILS_ROUTES_SMOKE_SCHEMA_VERSION,
      ok: false,
      skip: "lift-json",
      routeCount: 0,
      holeCount: null,
      generatedAt: new Date().toISOString(),
    };
  }

  const webirPath = join(root, ".chrysalis", "hub.ruby.webir.json");
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
    kind: HUB_RAILS_ROUTES_SMOKE_KIND,
    schemaVersion: HUB_RAILS_ROUTES_SMOKE_SCHEMA_VERSION,
    ok,
    routeCount,
    holeCount,
    gate: "G10115",
    decision: "D6540",
    priorSkip: "G10006",
    cwlProjection: projection,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runRailsRoutesSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

if (process.argv[1] && /hub-rails-routes-smoke\.mjs$/.test(process.argv[1].replace(/\\/g, "/"))) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
