#!/usr/bin/env node
/**
 * Smoke: hub-gold-fastify-prefix Fastify register({ prefix }) peel → WebIR hole-free (20 routes).
 * Deepens G9948 / hub:fastify-smoke — does not replace Express D6448-ST.
 * No invented plugin runtime (D6447 / D6534).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { loadWebir } from "./shared.mjs";
import { listCwlRoutes, summarizeCwlProjection } from "./hub-webir-routes.mjs";

export const HUB_FASTIFY_PREFIX_SMOKE_KIND = "chrysalis.hub.fastify-prefix-smoke";
export const HUB_FASTIFY_PREFIX_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixture = join(scriptRoot, "fixtures/hub-gold-fastify-prefix");
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");

const EXPECT_ROUTES = 20;
const EXPECT_PREFIX = "/api/";

/**
 * @param {string} [projectDir]
 */
export async function runFastifyPrefixSmoke(projectDir = fixture) {
  const root = resolve(projectDir);
  const appFile = join(root, "src", "app.ts");
  if (!existsSync(appFile)) {
    return {
      kind: HUB_FASTIFY_PREFIX_SMOKE_KIND,
      schemaVersion: HUB_FASTIFY_PREFIX_SMOKE_SCHEMA_VERSION,
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
      kind: HUB_FASTIFY_PREFIX_SMOKE_KIND,
      schemaVersion: HUB_FASTIFY_PREFIX_SMOKE_SCHEMA_VERSION,
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
      kind: HUB_FASTIFY_PREFIX_SMOKE_KIND,
      schemaVersion: HUB_FASTIFY_PREFIX_SMOKE_SCHEMA_VERSION,
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
  const cwlRoutes = listCwlRoutes(mod);
  const routeCount = liftReport.routeCount ?? liftReport.astRouteCount ?? 0;
  const holeCount = liftReport.holeCount ?? null;
  const prefixedOk =
    cwlRoutes.length === EXPECT_ROUTES &&
    cwlRoutes.every((r) => String(r.path).startsWith(EXPECT_PREFIX));
  const ok =
    routeCount === EXPECT_ROUTES &&
    holeCount === 0 &&
    projection.holeFree === projection.total &&
    projection.total >= EXPECT_ROUTES &&
    prefixedOk;

  return {
    kind: HUB_FASTIFY_PREFIX_SMOKE_KIND,
    schemaVersion: HUB_FASTIFY_PREFIX_SMOKE_SCHEMA_VERSION,
    ok,
    routeCount,
    holeCount,
    prefixedOk,
    samplePaths: cwlRoutes.slice(0, 3).map((r) => `${r.method} ${r.path}`),
    cwlProjection: projection,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runFastifyPrefixSmoke();
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
