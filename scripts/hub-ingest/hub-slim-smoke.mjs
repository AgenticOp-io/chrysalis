#!/usr/bin/env node
/**
 * Smoke: hub-gold-slim Slim dialect → WebIR hole-free (20 routes).
 * Does not replace Laravel/Symfony/plain-php D6448-ST. G10028 / D6490.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { loadWebir } from "./shared.mjs";
import { summarizeCwlProjection } from "./hub-webir-routes.mjs";

export const HUB_SLIM_SMOKE_KIND = "chrysalis.hub.slim-smoke";
export const HUB_SLIM_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixture = join(scriptRoot, "fixtures/hub-gold-slim");
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");

const EXPECT_ROUTES = 20;

/**
 * @param {string} [projectDir]
 */
export async function runSlimSmoke(projectDir = fixture) {
  const root = resolve(projectDir);
  const appFile = join(root, "app.php");
  if (!existsSync(appFile)) {
    return {
      kind: HUB_SLIM_SMOKE_KIND,
      schemaVersion: HUB_SLIM_SMOKE_SCHEMA_VERSION,
      ok: false,
      skip: "missing-app-php",
      routeCount: 0,
      holeCount: null,
      generatedAt: new Date().toISOString(),
    };
  }

  const lift = spawnSync(process.execPath, [liftScript, root, "--language", "php"], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  if (lift.status !== 0) {
    return {
      kind: HUB_SLIM_SMOKE_KIND,
      schemaVersion: HUB_SLIM_SMOKE_SCHEMA_VERSION,
      ok: false,
      skip: "php-lift-failed",
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
      kind: HUB_SLIM_SMOKE_KIND,
      schemaVersion: HUB_SLIM_SMOKE_SCHEMA_VERSION,
      ok: false,
      skip: "lift-json",
      routeCount: 0,
      holeCount: null,
      generatedAt: new Date().toISOString(),
    };
  }

  const webirPath = join(root, ".chrysalis", "hub.php.webir.json");
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
    kind: HUB_SLIM_SMOKE_KIND,
    schemaVersion: HUB_SLIM_SMOKE_SCHEMA_VERSION,
    ok,
    routeCount,
    holeCount,
    cwlProjection: projection,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runSlimSmoke();
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
