#!/usr/bin/env node
/**
 * Smoke: hub-gold-sinatra-ns Sinatra namespace('/api') peel → WebIR hole-free (20 routes).
 * Deepens Sinatra D6448-ST (G10073 / D6535). Do not break hub:roda/grape/padrino-smoke.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { loadWebir } from "./shared.mjs";
import { listCwlRoutes, summarizeCwlProjection } from "./hub-webir-routes.mjs";

export const HUB_SINATRA_NS_SMOKE_KIND = "chrysalis.hub.sinatra-ns-smoke";
export const HUB_SINATRA_NS_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixture = join(scriptRoot, "fixtures/hub-gold-sinatra-ns");
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");

const EXPECT_ROUTES = 20;
/** Namespace peel must join `/api` onto every route path. */
const EXPECT_PATH_PREFIX = "/api/";

/**
 * @param {string} [projectDir]
 */
export async function runSinatraNsSmoke(projectDir = fixture) {
  const root = resolve(projectDir);
  const appFile = join(root, "app.rb");
  if (!existsSync(appFile)) {
    return {
      kind: HUB_SINATRA_NS_SMOKE_KIND,
      schemaVersion: HUB_SINATRA_NS_SMOKE_SCHEMA_VERSION,
      ok: false,
      skip: "missing-app-rb",
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
      kind: HUB_SINATRA_NS_SMOKE_KIND,
      schemaVersion: HUB_SINATRA_NS_SMOKE_SCHEMA_VERSION,
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
      kind: HUB_SINATRA_NS_SMOKE_KIND,
      schemaVersion: HUB_SINATRA_NS_SMOKE_SCHEMA_VERSION,
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

  const cwlRoutes = listCwlRoutes(mod);
  const paths = cwlRoutes.map((r) => r.path);
  const prefixedOk =
    paths.length >= EXPECT_ROUTES &&
    paths.every((p) => typeof p === "string" && p.startsWith(EXPECT_PATH_PREFIX));

  const ok =
    routeCount === EXPECT_ROUTES &&
    holeCount === 0 &&
    projection.holeFree === projection.total &&
    projection.total >= EXPECT_ROUTES &&
    prefixedOk;

  return {
    kind: HUB_SINATRA_NS_SMOKE_KIND,
    schemaVersion: HUB_SINATRA_NS_SMOKE_SCHEMA_VERSION,
    ok,
    routeCount,
    holeCount,
    pathPrefixOk: prefixedOk,
    samplePaths: paths.slice(0, 5),
    cwlProjection: projection,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runSinatraNsSmoke();
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
