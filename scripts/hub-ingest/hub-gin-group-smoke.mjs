#!/usr/bin/env node
/**
 * Smoke: hub-gold-gin-group — Gin literal Group prefix peel → WebIR 20/20 (G10066 / D6528).
 * Does not replace flat Gin hub-flagship-go D6448-ST.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { loadWebir } from "./shared.mjs";
import { listCwlRoutes, summarizeCwlProjection } from "./hub-webir-routes.mjs";

export const HUB_GIN_GROUP_SMOKE_KIND = "chrysalis.hub.gin-group-smoke";
export const HUB_GIN_GROUP_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixture = join(scriptRoot, "fixtures/hub-gold-gin-group");
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");

const EXPECT_ROUTES = 20;
/** Joined Group paths that must appear (proves prefix peel, not flat relative paths). */
const EXPECT_JOINED = [
  "GET /meta/version",
  "GET /meta",
  "POST /api/echo",
  "GET /api/items",
  "GET /api/items/:id",
  "GET /api/users/:userId",
];

/**
 * @param {string} [projectDir]
 */
export async function runGinGroupSmoke(projectDir = fixture) {
  const root = resolve(projectDir);
  const appFile = join(root, "main.go");
  if (!existsSync(appFile)) {
    return {
      kind: HUB_GIN_GROUP_SMOKE_KIND,
      schemaVersion: HUB_GIN_GROUP_SMOKE_SCHEMA_VERSION,
      ok: false,
      skip: "missing-main-go",
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
      kind: HUB_GIN_GROUP_SMOKE_KIND,
      schemaVersion: HUB_GIN_GROUP_SMOKE_SCHEMA_VERSION,
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
      kind: HUB_GIN_GROUP_SMOKE_KIND,
      schemaVersion: HUB_GIN_GROUP_SMOKE_SCHEMA_VERSION,
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
  const routes = listCwlRoutes(mod);
  const routeKeys = new Set(routes.map((r) => `${String(r.method).toUpperCase()} ${r.path}`));
  const missingJoined = EXPECT_JOINED.filter((k) => !routeKeys.has(k));
  const routeCount = liftReport.routeCount ?? liftReport.astRouteCount ?? 0;
  const holeCount = liftReport.holeCount ?? null;
  const ok =
    routeCount === EXPECT_ROUTES &&
    holeCount === 0 &&
    missingJoined.length === 0 &&
    projection.holeFree === projection.total &&
    projection.total >= EXPECT_ROUTES;

  return {
    kind: HUB_GIN_GROUP_SMOKE_KIND,
    schemaVersion: HUB_GIN_GROUP_SMOKE_SCHEMA_VERSION,
    ok,
    routeCount,
    holeCount,
    missingJoined: missingJoined.length ? missingJoined : undefined,
    sampleJoined: EXPECT_JOINED.filter((k) => routeKeys.has(k)),
    cwlProjection: projection,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runGinGroupSmoke();
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
