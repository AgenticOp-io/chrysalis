/**
 * Asset hub emit targets (file-lift / scaffold outputs with route-manifest oracle).
 */
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** @type {readonly string[]} */
export const HUB_ASSET_GOLD_EMIT_TARGETS = [
  "c",
  "cpp",
  "sql",
  "html",
  "css",
  "scss",
  "json",
  "yaml",
  "markdown",
  "vue",
];

/**
 * @param {string} emitTarget
 */
export function isHubAssetGoldEmitTarget(emitTarget) {
  return HUB_ASSET_GOLD_EMIT_TARGETS.includes(emitTarget);
}

/**
 * @param {string} fixture
 * @param {string} origin
 * @param {string} emitTarget
 */
export function runAssetGoldEmit(fixture, origin, emitTarget) {
  if (!isHubAssetGoldEmitTarget(emitTarget)) {
    return { status: 1, stdout: "", stderr: `unknown asset emit target: ${emitTarget}` };
  }
  return spawnSync(
    process.execPath,
    [join(scriptRoot, "scripts/hub-ingest/emit-asset-from-hub.mjs"), fixture, "--origin", origin, "--output", emitTarget],
    { cwd: scriptRoot, encoding: "utf8" },
  );
}
