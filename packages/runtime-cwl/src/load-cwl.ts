import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Module } from "@chrysalis/webir";
import { loadModuleFromGoldenJson } from "./runtime.js";

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/**
 * Lift a `.cwl` file to WebIR via the hub export script (monorepo bridge).
 */
export function loadModuleFromCwlFile(cwlPath: string, repoRoot = pkgRoot): Module {
  const script = resolve(repoRoot, "scripts/hub-ingest/export-cwl-webir.mjs");
  const r = spawnSync(process.execPath, [script, resolve(cwlPath)], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (r.status !== 0) {
    throw new Error(r.stderr?.trim() || `export-cwl-webir failed (exit ${r.status})`);
  }
  const json = r.stdout.trim();
  return loadModuleFromGoldenJson(json);
}

export function loadModuleFromWebirJsonFile(jsonPath: string): Module {
  return loadModuleFromGoldenJson(readFileSync(resolve(jsonPath), "utf8"));
}
