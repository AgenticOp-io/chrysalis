/**
 * Native hub emit targets for structural gold verify (java, go, python, …).
 */
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** @type {Readonly<Record<string, string>>} */
export const HUB_NATIVE_EMIT_SCRIPTS = {
  python: "emit-python-from-hub.mjs",
  java: "emit-java-from-hub.mjs",
  go: "emit-go-from-hub.mjs",
  ruby: "emit-ruby-from-hub.mjs",
  csharp: "emit-csharp-from-hub.mjs",
  php: "emit-php-from-hub.mjs",
  rust: "emit-rust-from-hub.mjs",
  kotlin: "emit-kotlin-from-hub.mjs",
  scala: "emit-scala-from-hub.mjs",
  swift: "emit-swift-from-hub.mjs",
};

/** @returns {string[]} */
export function hubNativeEmitTargetIds() {
  return Object.keys(HUB_NATIVE_EMIT_SCRIPTS);
}

/**
 * @param {string} emitTarget
 */
export function isHubNativeGoldEmitTarget(emitTarget) {
  return Object.hasOwn(HUB_NATIVE_EMIT_SCRIPTS, emitTarget);
}

/**
 * @param {string} fixture
 * @param {string} origin
 * @param {string} emitTarget
 */
export function runNativeGoldEmit(fixture, origin, emitTarget) {
  const script = HUB_NATIVE_EMIT_SCRIPTS[emitTarget];
  if (!script) {
    return { status: 1, stdout: "", stderr: `unknown native emit target: ${emitTarget}` };
  }
  return spawnSync(process.execPath, [join(scriptRoot, "scripts/hub-ingest", script), fixture, "--origin", origin], {
    cwd: scriptRoot,
    encoding: "utf8",
  });
}
