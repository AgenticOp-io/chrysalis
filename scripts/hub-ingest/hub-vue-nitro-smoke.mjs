#!/usr/bin/env node
/**
 * Smoke: hub-gold-vue-nitro Nitro/h3 dialect → WebIR hole-free (20 routes + middleware).
 * Does not replace Express-in-SFC hub-flagship-vue D6448-ST.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { loadWebir } from "./shared.mjs";
import { summarizeCwlProjection } from "./hub-webir-routes.mjs";

export const HUB_VUE_NITRO_SMOKE_KIND = "chrysalis.hub.vue-nitro-smoke";
export const HUB_VUE_NITRO_SMOKE_SCHEMA_VERSION = 2;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixture = join(scriptRoot, "fixtures/hub-gold-vue-nitro");
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");

/** Expected express-depth API route count (unchanged surface). */
const EXPECT_ROUTES = 20;
/** Root + nested server/middleware pass-through presets. */
const EXPECT_MIDDLEWARE = 2;

/**
 * @param {string} [projectDir]
 */
export async function runVueNitroSmoke(projectDir = fixture) {
  const root = resolve(projectDir);
  const apiDir = join(root, "server", "api");
  if (!existsSync(apiDir)) {
    return {
      kind: HUB_VUE_NITRO_SMOKE_KIND,
      schemaVersion: HUB_VUE_NITRO_SMOKE_SCHEMA_VERSION,
      ok: false,
      skip: "missing-server-api",
      routeCount: 0,
      holeCount: null,
      generatedAt: new Date().toISOString(),
    };
  }

  const lift = spawnSync(process.execPath, [liftScript, root, "--language", "nuxt"], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  if (lift.status !== 0) {
    return {
      kind: HUB_VUE_NITRO_SMOKE_KIND,
      schemaVersion: HUB_VUE_NITRO_SMOKE_SCHEMA_VERSION,
      ok: false,
      skip: "nuxt-lift-failed",
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
      kind: HUB_VUE_NITRO_SMOKE_KIND,
      schemaVersion: HUB_VUE_NITRO_SMOKE_SCHEMA_VERSION,
      ok: false,
      skip: "lift-json",
      routeCount: 0,
      holeCount: null,
      generatedAt: new Date().toISOString(),
    };
  }

  const webirPath = join(root, ".chrysalis", "hub.nuxt.webir.json");
  const webir = await loadWebir();
  const raw = JSON.parse(readFileSync(webirPath, "utf8"));
  const mod = webir.moduleFromGoldenSnapshot(raw);
  const projection = summarizeCwlProjection(mod);
  const astRouteCount = liftReport.astRouteCount ?? 0;
  const holeCount = liftReport.holeCount ?? null;
  const middlewareUseCount = liftReport.middlewareUseCount ?? 0;
  const middlewareLoweredCount = liftReport.middlewareLoweredCount ?? 0;
  // module.roots includes middleware; prefer astRouteCount for API surface.
  const ok =
    astRouteCount === EXPECT_ROUTES &&
    holeCount === 0 &&
    middlewareUseCount === EXPECT_MIDDLEWARE &&
    middlewareLoweredCount === EXPECT_MIDDLEWARE &&
    projection.holeFree === projection.total &&
    projection.total >= EXPECT_ROUTES;

  return {
    kind: HUB_VUE_NITRO_SMOKE_KIND,
    schemaVersion: HUB_VUE_NITRO_SMOKE_SCHEMA_VERSION,
    ok,
    routeCount: astRouteCount,
    holeCount,
    middlewareUseCount,
    middlewareLoweredCount,
    cwlProjection: projection,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runVueNitroSmoke();
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
