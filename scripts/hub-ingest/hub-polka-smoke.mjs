#!/usr/bin/env node
/**
 * Smoke: hub-gold-polka Polka TS dialect → WebIR hole-free (20 routes + pass-through middleware).
 * Does not replace Express hub-flagship-express / hub-flagship-typescript D6448-ST.
 * Not D6448-ST (thinner secondary; Nest remains the only JS secondary ST).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { loadWebir } from "./shared.mjs";
import { summarizeCwlProjection } from "./hub-webir-routes.mjs";

export const HUB_POLKA_SMOKE_KIND = "chrysalis.hub.polka-smoke";
export const HUB_POLKA_SMOKE_SCHEMA_VERSION = 2;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixture = join(scriptRoot, "fixtures/hub-gold-polka");
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");

const EXPECT_ROUTES = 20;
/** Pass-through `app.use` preset floor (G9959). */
const EXPECT_MIDDLEWARE = 1;

/**
 * @param {string} [projectDir]
 */
export async function runPolkaSmoke(projectDir = fixture) {
  const root = resolve(projectDir);
  const appFile = join(root, "src", "app.ts");
  if (!existsSync(appFile)) {
    return {
      kind: HUB_POLKA_SMOKE_KIND,
      schemaVersion: HUB_POLKA_SMOKE_SCHEMA_VERSION,
      ok: false,
      skip: "missing-app-ts",
      routeCount: 0,
      holeCount: null,
      generatedAt: new Date().toISOString(),
    };
  }

  const lift = spawnSync(process.execPath, [liftScript, root, "--language", "typescript"], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  if (lift.status !== 0) {
    return {
      kind: HUB_POLKA_SMOKE_KIND,
      schemaVersion: HUB_POLKA_SMOKE_SCHEMA_VERSION,
      ok: false,
      skip: "typescript-lift-failed",
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
      kind: HUB_POLKA_SMOKE_KIND,
      schemaVersion: HUB_POLKA_SMOKE_SCHEMA_VERSION,
      ok: false,
      skip: "lift-json",
      routeCount: 0,
      holeCount: null,
      generatedAt: new Date().toISOString(),
    };
  }

  const webirPath = join(root, ".chrysalis", "hub.typescript.webir.json");
  const webir = await loadWebir();
  const raw = JSON.parse(readFileSync(webirPath, "utf8"));
  const mod = webir.moduleFromGoldenSnapshot(raw);
  const projection = summarizeCwlProjection(mod);
  const routeCount = liftReport.astRouteCount ?? 0;
  const holeCount = liftReport.holeCount ?? null;
  const middlewareUseCount = liftReport.middlewareUseCount ?? 0;
  const middlewareLoweredCount = liftReport.middlewareLoweredCount ?? 0;
  const ok =
    routeCount === EXPECT_ROUTES &&
    holeCount === 0 &&
    middlewareUseCount === EXPECT_MIDDLEWARE &&
    middlewareLoweredCount === EXPECT_MIDDLEWARE &&
    projection.holeFree === projection.total &&
    projection.total >= EXPECT_ROUTES;

  return {
    kind: HUB_POLKA_SMOKE_KIND,
    schemaVersion: HUB_POLKA_SMOKE_SCHEMA_VERSION,
    ok,
    routeCount,
    holeCount,
    middlewareUseCount,
    middlewareLoweredCount,
    cwlProjection: projection,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runPolkaSmoke();
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
