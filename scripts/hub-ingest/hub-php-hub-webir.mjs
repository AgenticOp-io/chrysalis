#!/usr/bin/env node
/**
 * Export @chrysalis/ingest WebIR for hub gold emit (PHP origin).
 */
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { hubWebirPath } from "./shared.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const exportScript = join(scriptRoot, "scripts/hub-ingest/export-project-webir.mjs");

function phpOnPath() {
  return spawnSync("php", ["-v"], { encoding: "utf8" }).status === 0;
}

/** @param {string} filePath @param {number} [attempts] */
async function readTextWithRetry(filePath, attempts = 6) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try {
      return await readFile(filePath, "utf8");
    } catch (e) {
      last = e;
      if (/** @type {NodeJS.ErrnoException} */ (e).code === "EBUSY" && i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100 * (i + 1)));
        continue;
      }
      throw e;
    }
  }
  throw last;
}

function countRoutes(projectDir) {
  const routesPath = join(projectDir, "chrysalis.routes.json");
  if (!existsSync(routesPath)) return 0;
  try {
    const j = JSON.parse(require("node:fs").readFileSync(routesPath, "utf8"));
    return Array.isArray(j.routes) ? j.routes.length : 0;
  } catch {
    return 0;
  }
}

/**
 * @param {string} projectDir
 */
export async function exportPhpHubWebir(projectDir) {
  const root = resolve(projectDir);
  const out = hubWebirPath(root, "php");
  if (!phpOnPath()) {
    return { ok: false, skip: "php-not-on-path", routeCount: countRoutes(root) };
  }
  if (!existsSync(join(root, "chrysalis.routes.json"))) {
    return { ok: false, skip: "missing-chrysalis-routes-json" };
  }

  await mkdir(dirname(out), { recursive: true });
  const ingested = join(root, ".chrysalis", "ingested.webir.json");
  const r = spawnSync(process.execPath, [exportScript, root, "--out", ingested], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (r.status !== 0) {
    return { ok: false, skip: "ingest-export-failed", detail: (r.stderr || r.stdout)?.slice(0, 400) };
  }
  await copyFile(ingested, out);

  const webir = await import(pathToFileURL(join(scriptRoot, "packages/webir/dist/index.js")).href);
  const raw = JSON.parse(await readTextWithRetry(out));
  const mod = webir.moduleFromGoldenSnapshot(raw);
  const footprint = webir.computeOracleFootprint(mod);
  const routeCount = mod.roots.length;

  let cwlProjection = null;
  try {
    const { summarizeCwlProjection } = await import(pathToFileURL(join(scriptRoot, "scripts/hub-ingest/hub-webir-routes.mjs")).href);
    cwlProjection = summarizeCwlProjection(mod);
  } catch {
    cwlProjection = null;
  }

  return {
    ok: footprint.totalHoleCount === 0,
    routeCount,
    holeCount: footprint.totalHoleCount,
    webirPath: out,
    footprint,
    cwlProjection,
  };
}
