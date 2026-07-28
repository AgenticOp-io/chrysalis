#!/usr/bin/env node
/**
 * Smoke: hub-gold-spring-requestmapping Spring MVC @RequestMapping edge peels →
 * WebIR hole-free (20 routes). Does not replace hub-flagship-java Spring D6448-ST.
 * No DI / filters invented (D6447). G10071 / D6533.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { loadWebir } from "./shared.mjs";
import { summarizeCwlProjection } from "./hub-webir-routes.mjs";

export const HUB_SPRING_REQUESTMAPPING_SMOKE_KIND = "chrysalis.hub.spring-requestmapping-smoke";
export const HUB_SPRING_REQUESTMAPPING_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixture = join(scriptRoot, "fixtures/hub-gold-spring-requestmapping");
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");

const EXPECT_ROUTES = 20;

/**
 * @param {string} [projectDir]
 */
export async function runSpringRequestmappingSmoke(projectDir = fixture) {
  const root = resolve(projectDir);
  const controllerFile = join(root, "src", "HubController.java");
  if (!existsSync(controllerFile)) {
    return {
      kind: HUB_SPRING_REQUESTMAPPING_SMOKE_KIND,
      schemaVersion: HUB_SPRING_REQUESTMAPPING_SMOKE_SCHEMA_VERSION,
      ok: false,
      skip: "missing-hub-controller-java",
      routeCount: 0,
      holeCount: null,
      generatedAt: new Date().toISOString(),
    };
  }

  const lift = spawnSync(process.execPath, [liftScript, root, "--language", "java"], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  if (lift.status !== 0) {
    return {
      kind: HUB_SPRING_REQUESTMAPPING_SMOKE_KIND,
      schemaVersion: HUB_SPRING_REQUESTMAPPING_SMOKE_SCHEMA_VERSION,
      ok: false,
      skip: "java-lift-failed",
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
      kind: HUB_SPRING_REQUESTMAPPING_SMOKE_KIND,
      schemaVersion: HUB_SPRING_REQUESTMAPPING_SMOKE_SCHEMA_VERSION,
      ok: false,
      skip: "lift-json",
      routeCount: 0,
      holeCount: null,
      generatedAt: new Date().toISOString(),
    };
  }

  const webirPath = join(root, ".chrysalis", "hub.java.webir.json");
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
    kind: HUB_SPRING_REQUESTMAPPING_SMOKE_KIND,
    schemaVersion: HUB_SPRING_REQUESTMAPPING_SMOKE_SCHEMA_VERSION,
    ok,
    routeCount,
    holeCount,
    springRequestmappingRouteCount: liftReport.astRouteCount ?? null,
    cwlProjection: projection,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runSpringRequestmappingSmoke();
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
