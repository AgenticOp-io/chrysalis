#!/usr/bin/env node
/**
 * Smoke: hub-gold-drogon Drogon registerHandler dialect → WebIR hole-free (20 routes).
 * Does not replace Crow hub-flagship-cpp D6448-ST (G10117 / D6542).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { loadWebir } from "./shared.mjs";
import { summarizeCwlProjection } from "./hub-webir-routes.mjs";

export const HUB_DROGON_SMOKE_KIND = "chrysalis.hub.drogon-smoke";
export const HUB_DROGON_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixture = join(scriptRoot, "fixtures/hub-gold-drogon");
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");

/**
 * @param {string} [projectDir]
 */
export async function runDrogonSmoke(projectDir = fixture) {
  const root = resolve(projectDir);
  const mainCpp = join(root, "src", "main.cpp");
  if (!existsSync(mainCpp)) {
    return {
      kind: HUB_DROGON_SMOKE_KIND,
      schemaVersion: HUB_DROGON_SMOKE_SCHEMA_VERSION,
      ok: false,
      skip: "missing-drogon-main",
      routeCount: 0,
      holeCount: null,
      generatedAt: new Date().toISOString(),
    };
  }

  const lift = spawnSync(process.execPath, [liftScript, root, "--language", "cpp"], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  if (lift.status !== 0) {
    return {
      kind: HUB_DROGON_SMOKE_KIND,
      schemaVersion: HUB_DROGON_SMOKE_SCHEMA_VERSION,
      ok: false,
      skip: "cpp-lift-failed",
      stderr: (lift.stderr || lift.stdout || "").slice(0, 800),
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
      kind: HUB_DROGON_SMOKE_KIND,
      schemaVersion: HUB_DROGON_SMOKE_SCHEMA_VERSION,
      ok: false,
      skip: "lift-json",
      routeCount: 0,
      holeCount: null,
      generatedAt: new Date().toISOString(),
    };
  }

  const webirPath = join(root, ".chrysalis", "hub.cpp.webir.json");
  const webir = await loadWebir();
  const raw = JSON.parse(readFileSync(webirPath, "utf8"));
  const mod = webir.moduleFromGoldenSnapshot(raw);
  const projection = summarizeCwlProjection(mod);
  const routeCount = liftReport.routeCount ?? 0;
  const holeCount = liftReport.holeCount ?? null;
  const ok =
    routeCount === 20 &&
    holeCount === 0 &&
    projection.holeFree === projection.total &&
    projection.total >= 20;

  return {
    kind: HUB_DROGON_SMOKE_KIND,
    schemaVersion: HUB_DROGON_SMOKE_SCHEMA_VERSION,
    ok,
    gate: "G10117",
    decision: "D6542",
    routeCount,
    holeCount,
    cwlProjection: projection,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runDrogonSmoke();
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
