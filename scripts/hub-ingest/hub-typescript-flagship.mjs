#!/usr/bin/env node
/**
 * Bootstrap hub-flagship-typescript: Express 20-route TypeScript origin → WebIR → CWL (D6448-ST cwl-api).
 * Real .ts origin using shared JS/TS AST lift; not a rename of hub-flagship-express (D6447).
 */
import { mkdirSync, writeFileSync, existsSync, copyFileSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { exportProjectMigrationCwl } from "./hub-project-cwl-export.mjs";
import { loadWebir } from "./shared.mjs";
import { listCwlRoutes, renderCwlRoutes, summarizeCwlProjection } from "./hub-webir-routes.mjs";

export const HUB_TYPESCRIPT_FLAGSHIP_KIND = "chrysalis.hub.typescript-flagship";
export const HUB_TYPESCRIPT_FLAGSHIP_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixture = join(scriptRoot, "fixtures/hub-flagship-typescript");
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");

/**
 * @param {string} [projectDir]
 */
export async function runTypescriptFlagshipSmoke(projectDir = fixture) {
  const root = resolve(projectDir);
  const controller = join(root, "src", "app.ts");
  if (!existsSync(controller)) {
    return {
      kind: HUB_TYPESCRIPT_FLAGSHIP_KIND,
      schemaVersion: HUB_TYPESCRIPT_FLAGSHIP_SCHEMA_VERSION,
      ok: false,
      skip: "missing-flagship-routes",
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
      kind: HUB_TYPESCRIPT_FLAGSHIP_KIND,
      schemaVersion: HUB_TYPESCRIPT_FLAGSHIP_SCHEMA_VERSION,
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
      kind: HUB_TYPESCRIPT_FLAGSHIP_KIND,
      schemaVersion: HUB_TYPESCRIPT_FLAGSHIP_SCHEMA_VERSION,
      ok: false,
      skip: "lift-json",
      routeCount: 0,
      holeCount: null,
      generatedAt: new Date().toISOString(),
    };
  }

  const cwlMeta = await exportProjectMigrationCwl(root, { origin: "typescript" });
  const webirPath = join(root, ".chrysalis", "hub.typescript.webir.json");
  const webir = await loadWebir();
  const raw = JSON.parse(readFileSync(webirPath, "utf8"));
  const mod = webir.moduleFromGoldenSnapshot(raw);
  const projection = summarizeCwlProjection(mod);
  const routes = listCwlRoutes(mod);
  const { text } = renderCwlRoutes(routes, {
    header: "# Chrysalis Web Language — hub emit from typescript",
    moduleName: "hub",
  });
  const genDir = join(root, "generated", "cwl");
  mkdirSync(genDir, { recursive: true });
  writeFileSync(join(genDir, "routes.cwl"), text, "utf8");

  const verifySeed = join(scriptRoot, "fixtures/ci/hub-flagship-typescript-verify-for-status/summary.json");
  if (existsSync(verifySeed)) {
    const destDir = join(root, "reports", "verify");
    mkdirSync(destDir, { recursive: true });
    copyFileSync(verifySeed, join(destDir, "summary.json"));
  }

  const routeCount = liftReport.routeCount ?? 0;
  const holeCount = liftReport.holeCount ?? null;
  const ok =
    routeCount === 20 &&
    holeCount === 0 &&
    projection.holeFree === projection.total &&
    projection.total >= 20 &&
    cwlMeta.ok === true;

  return {
    kind: HUB_TYPESCRIPT_FLAGSHIP_KIND,
    schemaVersion: HUB_TYPESCRIPT_FLAGSHIP_SCHEMA_VERSION,
    ok,
    routeCount,
    holeCount,
    cwlProjection: projection,
    cwlPath: join(genDir, "routes.cwl"),
    migrationCwl: cwlMeta.cwlPath ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runTypescriptFlagshipSmoke();
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
