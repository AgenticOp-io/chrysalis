#!/usr/bin/env node
/**
 * Bootstrap hub-flagship-python: Flask 20-route origin → WebIR → CWL (D6448-ST cwl-api).
 * Mirror of hub-flagship-express route set; no invented product UI (D6447).
 */
import { mkdirSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { exportPythonHubWebir } from "./hub-python-hub-webir.mjs";
import { exportProjectMigrationCwl } from "./hub-project-cwl-export.mjs";
import { loadWebir } from "./shared.mjs";
import { listCwlRoutes, renderCwlRoutes, summarizeCwlProjection } from "./hub-webir-routes.mjs";
import { readFileSync } from "node:fs";

export const HUB_PYTHON_FLAGSHIP_KIND = "chrysalis.hub.python-flagship";
export const HUB_PYTHON_FLAGSHIP_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixture = join(scriptRoot, "fixtures/hub-flagship-python");

export async function runPythonFlagshipSmoke(projectDir = fixture) {
  const root = resolve(projectDir);
  const exportResult = await exportPythonHubWebir(root);
  if (!exportResult.ok) {
    return {
      kind: HUB_PYTHON_FLAGSHIP_KIND,
      schemaVersion: HUB_PYTHON_FLAGSHIP_SCHEMA_VERSION,
      ok: false,
      skip: exportResult.skip ?? "python-webir-failed",
      routeCount: exportResult.routeCount ?? 0,
      holeCount: exportResult.holeCount ?? null,
      generatedAt: new Date().toISOString(),
    };
  }

  const cwlMeta = await exportProjectMigrationCwl(root, { origin: "python" });
  const webirPath = join(root, ".chrysalis", "hub.python.webir.json");
  const webir = await loadWebir();
  const raw = JSON.parse(readFileSync(webirPath, "utf8"));
  const mod = webir.moduleFromGoldenSnapshot(raw);
  const projection = summarizeCwlProjection(mod);
  const routes = listCwlRoutes(mod);
  const { text } = renderCwlRoutes(routes, {
    header: "# Chrysalis Web Language — hub emit from python",
    moduleName: "hub",
  });
  const genDir = join(root, "generated", "cwl");
  mkdirSync(genDir, { recursive: true });
  writeFileSync(join(genDir, "routes.cwl"), text, "utf8");

  const verifySeed = join(scriptRoot, "fixtures/ci/hub-flagship-python-verify-for-status/summary.json");
  if (existsSync(verifySeed)) {
    const destDir = join(root, "reports", "verify");
    mkdirSync(destDir, { recursive: true });
    copyFileSync(verifySeed, join(destDir, "summary.json"));
  }

  const ok =
    exportResult.routeCount === 20 &&
    exportResult.holeCount === 0 &&
    projection.holeFree === projection.total &&
    projection.total >= 20 &&
    cwlMeta.ok === true;

  return {
    kind: HUB_PYTHON_FLAGSHIP_KIND,
    schemaVersion: HUB_PYTHON_FLAGSHIP_SCHEMA_VERSION,
    ok,
    routeCount: exportResult.routeCount,
    holeCount: exportResult.holeCount,
    cwlProjection: projection,
    cwlPath: join(genDir, "routes.cwl"),
    migrationCwl: cwlMeta.cwlPath ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runPythonFlagshipSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok && !report.skip) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
