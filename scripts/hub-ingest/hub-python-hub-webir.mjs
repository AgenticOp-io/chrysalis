#!/usr/bin/env node
/**
 * Export @chrysalis/ingest hub Python WebIR for hub gold emit (G8721).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { hubWebirPath, resolveHubPython } from "./shared.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function pythonOnPath() {
  return spawnSync(resolveHubPython(), ["-c", "import ast"], { encoding: "utf8" }).status === 0;
}

/**
 * @param {string} projectDir
 */
export async function exportPythonHubWebir(projectDir) {
  const root = resolve(projectDir);
  const out = hubWebirPath(root, "python");
  if (!pythonOnPath()) {
    return { ok: false, skip: "python-not-on-path" };
  }
  const appPy = join(root, "app.py");
  if (!existsSync(appPy)) {
    return { ok: false, skip: "missing-app-py" };
  }

  const ingest = await import(pathToFileURL(join(scriptRoot, "packages/ingest/dist/index.js")).href);
  const webir = await import(pathToFileURL(join(scriptRoot, "packages/webir/dist/index.js")).href);
  const source = await readFile(appPy, "utf8");
  const { module, lift } = await ingest.ingestPythonHubSource(source, "app.py", "python");
  const snapshot = webir.moduleToGoldenSnapshot(module);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, `${snapshot}\n`, "utf8");

  const mod = webir.moduleFromGoldenSnapshot(snapshot);
  const footprint = webir.computeOracleFootprint(mod);
  return {
    ok: footprint.totalHoleCount === 0 && lift.routeCount > 0,
    routeCount: lift.routeCount,
    holeCount: footprint.totalHoleCount,
    webirPath: out,
    footprint,
    usedIngestAdapter: true,
  };
}

async function main() {
  const fixture = resolve(process.argv[2] ?? join(scriptRoot, "fixtures/hub-gold-python-literal"));
  const r = await exportPythonHubWebir(fixture);
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-python-hub-webir")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
