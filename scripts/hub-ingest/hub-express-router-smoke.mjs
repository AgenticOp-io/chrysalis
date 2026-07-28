#!/usr/bin/env node
/**
 * Smoke: hub-gold-express-router Express Router mount peel → WebIR hole-free
 * (20 routes under literal `app.use('/api', router)` path join).
 * Deepens Express ORIGIN (G10067 / D6529) — does not replace Express/TS D6448-ST.
 * Complex `use(prefix, mw, router)` stays honest hole; empty pass-through OK (G9959).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { loadWebir } from "./shared.mjs";
import { listCwlRoutes, summarizeCwlProjection } from "./hub-webir-routes.mjs";

export const HUB_EXPRESS_ROUTER_SMOKE_KIND = "chrysalis.hub.express-router-smoke";
export const HUB_EXPRESS_ROUTER_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixture = join(scriptRoot, "fixtures/hub-gold-express-router");
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");

const EXPECT_ROUTES = 20;
/** Joined mount proof — router `/health` under `app.use('/api', router)`. */
const EXPECT_JOINED_PATH = "/api/health";

/**
 * @param {string} [projectDir]
 */
export async function runExpressRouterSmoke(projectDir = fixture) {
  const root = resolve(projectDir);
  const appFile = join(root, "src", "app.ts");
  if (!existsSync(appFile)) {
    return {
      kind: HUB_EXPRESS_ROUTER_SMOKE_KIND,
      schemaVersion: HUB_EXPRESS_ROUTER_SMOKE_SCHEMA_VERSION,
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
      kind: HUB_EXPRESS_ROUTER_SMOKE_KIND,
      schemaVersion: HUB_EXPRESS_ROUTER_SMOKE_SCHEMA_VERSION,
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
      kind: HUB_EXPRESS_ROUTER_SMOKE_KIND,
      schemaVersion: HUB_EXPRESS_ROUTER_SMOKE_SCHEMA_VERSION,
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
  const paths = cwlRoutes.map((r) => r.path);
  const hasJoinedMount = paths.includes(EXPECT_JOINED_PATH);
  const routeCount = liftReport.astRouteCount ?? 0;
  const holeCount = liftReport.holeCount ?? null;
  const ok =
    routeCount === EXPECT_ROUTES &&
    holeCount === 0 &&
    hasJoinedMount &&
    projection.holeFree === projection.total &&
    projection.total >= EXPECT_ROUTES;

  return {
    kind: HUB_EXPRESS_ROUTER_SMOKE_KIND,
    schemaVersion: HUB_EXPRESS_ROUTER_SMOKE_SCHEMA_VERSION,
    ok,
    routeCount,
    holeCount,
    hasJoinedMount,
    joinedPath: EXPECT_JOINED_PATH,
    middlewareUseCount: liftReport.middlewareUseCount ?? 0,
    middlewareLoweredCount: liftReport.middlewareLoweredCount ?? 0,
    cwlProjection: projection,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runExpressRouterSmoke();
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
