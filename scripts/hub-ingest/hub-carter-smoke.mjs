#!/usr/bin/env node
/**
 * Smoke: hub-gold-carter Carter ICarterModule dialect → WebIR hole-free (20 routes).
 * Reuses Minimal API app.Map* peels / same csharp lift path as hub-flagship-csharp
 * (no MapCarter / DI invent). Does not replace Minimal API D6448-ST.
 * Honest holes: MapCarter bootstrap, DI, filters (D6447). G10041 / D6503.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { loadWebir } from "./shared.mjs";
import { summarizeCwlProjection } from "./hub-webir-routes.mjs";

export const HUB_CARTER_SMOKE_KIND = "chrysalis.hub.carter-smoke";
export const HUB_CARTER_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixture = join(scriptRoot, "fixtures/hub-gold-carter");
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");

const EXPECT_ROUTES = 20;

/**
 * @param {string} [projectDir]
 */
export async function runCarterSmoke(projectDir = fixture) {
  const root = resolve(projectDir);
  const moduleFile = join(root, "HubModule.cs");
  if (!existsSync(moduleFile)) {
    return {
      kind: HUB_CARTER_SMOKE_KIND,
      schemaVersion: HUB_CARTER_SMOKE_SCHEMA_VERSION,
      ok: false,
      skip: "missing-hub-module-cs",
      routeCount: 0,
      holeCount: null,
      generatedAt: new Date().toISOString(),
    };
  }

  const source = readFileSync(moduleFile, "utf8");
  if (!/ICarterModule/.test(source) || !/\bAddRoutes\s*\(/.test(source)) {
    return {
      kind: HUB_CARTER_SMOKE_KIND,
      schemaVersion: HUB_CARTER_SMOKE_SCHEMA_VERSION,
      ok: false,
      skip: "not-carter-module",
      routeCount: 0,
      holeCount: null,
      generatedAt: new Date().toISOString(),
    };
  }

  const lift = spawnSync(process.execPath, [liftScript, root, "--language", "csharp"], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  if (lift.status !== 0) {
    return {
      kind: HUB_CARTER_SMOKE_KIND,
      schemaVersion: HUB_CARTER_SMOKE_SCHEMA_VERSION,
      ok: false,
      skip: "csharp-lift-failed",
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
      kind: HUB_CARTER_SMOKE_KIND,
      schemaVersion: HUB_CARTER_SMOKE_SCHEMA_VERSION,
      ok: false,
      skip: "lift-json",
      routeCount: 0,
      holeCount: null,
      generatedAt: new Date().toISOString(),
    };
  }

  const webirPath = join(root, ".chrysalis", "hub.csharp.webir.json");
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
    kind: HUB_CARTER_SMOKE_KIND,
    schemaVersion: HUB_CARTER_SMOKE_SCHEMA_VERSION,
    ok,
    routeCount,
    holeCount,
    peelReuse: {
      dialect: "minimal-api",
      gate: "csharp-minimal-api-ST",
      smoke: "hub:complete-conversion-prove:csharp",
      note: "Carter ICarterModule.AddRoutes uses app.Map*; no MapCarter/DI invent (D6447).",
    },
    cwlProjection: projection,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCarterSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok && !report.skip) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
