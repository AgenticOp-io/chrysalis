/**
 * Resolve WPTP sibling roots for Convert Hub / CI.
 * Prefer AgenticOps `platforms/wptp-*` (portfolio layout); fall back to
 * `engines/wptp-*` clones next to chrysalis-convert; then env overrides.
 *
 * Convert owns this orbit. CWL does not. Consume `@chrysalis/webir` from CWL
 * reverse-home (packages/webir junction). See docs/WPTP-CONVERT-ORBIT.md.
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const WPTP_SIBLING_REPOS = [
  "wptp-ir",
  "wptp-matrix",
  "wptp-emit-nextjs",
  "wptp-emit-hono",
  "wptp-emit-fastify",
  "wptp-adapter-openapi",
  "wptp-adapter-browser",
];

/** @param {string} convertRoot */
export function resolveConvertRoot(convertRoot) {
  return resolve(convertRoot);
}

/**
 * @param {string} convertRoot
 * @returns {string} directory that *contains* wptp-* folders
 */
export function resolveWptpSiblingsRoot(convertRoot) {
  if (process.env.WPTP_SIBLINGS_ROOT) {
    return resolve(process.env.WPTP_SIBLINGS_ROOT);
  }
  const root = resolve(convertRoot);
  const platforms = resolve(root, "../../platforms");
  const engines = resolve(root, "..");
  // Prefer portfolio platforms/ when it has the IR hub (canonical AgenticOps layout).
  if (existsSync(join(platforms, "wptp-ir", "package.json"))) {
    return platforms;
  }
  if (existsSync(join(engines, "wptp-matrix", "package.json")) || existsSync(join(engines, "wptp-ir", "package.json"))) {
    return engines;
  }
  if (existsSync(platforms)) return platforms;
  return engines;
}

/**
 * @param {string} convertRoot
 * @param {string} name e.g. wptp-ir
 * @param {string} [envKey] optional env override for that repo root
 */
export function resolveWptpRepoRoot(convertRoot, name, envKey) {
  if (envKey && process.env[envKey]) {
    return resolve(process.env[envKey]);
  }
  const envMap = {
    "wptp-ir": "WPTP_IR_ROOT",
    "wptp-matrix": "WPTP_MATRIX_ROOT",
    "wptp-emit-nextjs": "WPTP_EMIT_NEXTJS_ROOT",
    "wptp-emit-hono": "WPTP_EMIT_HONO_ROOT",
    "wptp-emit-fastify": "WPTP_EMIT_FASTIFY_ROOT",
    "wptp-adapter-openapi": "WPTP_ADAPTER_OPENAPI_ROOT",
    "wptp-adapter-browser": "WPTP_ADAPTER_BROWSER_ROOT",
  };
  const key = envMap[name];
  if (key && process.env[key]) return resolve(process.env[key]);
  return join(resolveWptpSiblingsRoot(convertRoot), name);
}

/**
 * @param {string} convertRoot
 */
export function listWptpSiblingStatus(convertRoot) {
  const siblingsRoot = resolveWptpSiblingsRoot(convertRoot);
  return {
    siblingsRoot,
    repos: WPTP_SIBLING_REPOS.map((name) => {
      const root = resolveWptpRepoRoot(convertRoot, name);
      const pkg = join(root, "package.json");
      return { name, root, present: existsSync(pkg) };
    }),
  };
}

/** @param {string} [fromUrl] */
export function convertRootFromScript(fromUrl = import.meta.url) {
  return resolve(dirname(fileURLToPath(fromUrl)), "..");
}
