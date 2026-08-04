#!/usr/bin/env node
/**
 * Smoke: hub-gold-nancy Nancy FX NancyModule dialect → WebIR hole-free (20 routes).
 * Peels Get|Post|Put|Patch|Delete("/path", …) + Response.AsJson / HttpStatusCode /
 * parameters.id / Request.Query. Does not replace Minimal API D6448-ST.
 * Honest holes: NancyHost, DI, pipelines, indexer Get["…"] (D6447). G10114 / D6540.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { loadWebir } from "./shared.mjs";
import { summarizeCwlProjection } from "./hub-webir-routes.mjs";

export const HUB_NANCY_SMOKE_KIND = "chrysalis.hub.nancy-smoke";
export const HUB_NANCY_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixture = join(scriptRoot, "fixtures/hub-gold-nancy");
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");

const EXPECT_ROUTES = 20;

/**
 * @param {string} [projectDir]
 */
export async function runNancySmoke(projectDir = fixture) {
  const root = resolve(projectDir);
  const moduleFile = join(root, "HomeModule.cs");
  if (!existsSync(moduleFile)) {
    return {
      kind: HUB_NANCY_SMOKE_KIND,
      schemaVersion: HUB_NANCY_SMOKE_SCHEMA_VERSION,
      ok: false,
      skip: "missing-home-module-cs",
      routeCount: 0,
      holeCount: null,
      generatedAt: new Date().toISOString(),
    };
  }

  const source = readFileSync(moduleFile, "utf8");
  if (!/NancyModule/.test(source) || !/\bGet\s*\(/.test(source)) {
    return {
      kind: HUB_NANCY_SMOKE_KIND,
      schemaVersion: HUB_NANCY_SMOKE_SCHEMA_VERSION,
      ok: false,
      skip: "not-nancy-module",
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
      kind: HUB_NANCY_SMOKE_KIND,
      schemaVersion: HUB_NANCY_SMOKE_SCHEMA_VERSION,
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
      kind: HUB_NANCY_SMOKE_KIND,
      schemaVersion: HUB_NANCY_SMOKE_SCHEMA_VERSION,
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
    kind: HUB_NANCY_SMOKE_KIND,
    schemaVersion: HUB_NANCY_SMOKE_SCHEMA_VERSION,
    ok,
    routeCount,
    holeCount,
    gate: "G10114",
    decision: "D6540",
    cwlProjection: projection,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runNancySmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

if (process.argv[1] && /hub-nancy-smoke\.mjs$/.test(process.argv[1].replace(/\\/g, "/"))) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
