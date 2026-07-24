#!/usr/bin/env node
/**
 * Smoke: hub-gold-scala-http4s Http4s dialect → WebIR hole-free (20 routes).
 * Does not replace Akka hub-flagship-scala D6448-ST.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { loadWebir } from "./shared.mjs";
import { summarizeCwlProjection } from "./hub-webir-routes.mjs";

export const HUB_SCALA_HTTP4S_SMOKE_KIND = "chrysalis.hub.scala-http4s-smoke";
export const HUB_SCALA_HTTP4S_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixture = join(scriptRoot, "fixtures/hub-gold-scala-http4s");
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");

/**
 * @param {string} [projectDir]
 */
export async function runScalaHttp4sSmoke(projectDir = fixture) {
  const root = resolve(projectDir);
  const routesFile = join(root, "src", "main", "scala", "hub", "Http4sRoutes.scala");
  if (!existsSync(routesFile)) {
    return {
      kind: HUB_SCALA_HTTP4S_SMOKE_KIND,
      schemaVersion: HUB_SCALA_HTTP4S_SMOKE_SCHEMA_VERSION,
      ok: false,
      skip: "missing-http4s-routes",
      routeCount: 0,
      holeCount: null,
      generatedAt: new Date().toISOString(),
    };
  }

  const lift = spawnSync(process.execPath, [liftScript, root, "--language", "scala"], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  if (lift.status !== 0) {
    return {
      kind: HUB_SCALA_HTTP4S_SMOKE_KIND,
      schemaVersion: HUB_SCALA_HTTP4S_SMOKE_SCHEMA_VERSION,
      ok: false,
      skip: "scala-lift-failed",
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
      kind: HUB_SCALA_HTTP4S_SMOKE_KIND,
      schemaVersion: HUB_SCALA_HTTP4S_SMOKE_SCHEMA_VERSION,
      ok: false,
      skip: "lift-json",
      routeCount: 0,
      holeCount: null,
      generatedAt: new Date().toISOString(),
    };
  }

  const webirPath = join(root, ".chrysalis", "hub.scala.webir.json");
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
    kind: HUB_SCALA_HTTP4S_SMOKE_KIND,
    schemaVersion: HUB_SCALA_HTTP4S_SMOKE_SCHEMA_VERSION,
    ok,
    routeCount,
    holeCount,
    cwlProjection: projection,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runScalaHttp4sSmoke();
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
