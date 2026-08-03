/**
 * Resolve WISP Module_Manager / backend roots without hardcoding a developer machine path.
 *
 * Env (preferred):
 *   CHRYSALIS_WISP_MODULE_ROOT
 *   CHRYSALIS_WISP_BACKEND_ROOT
 *
 * Fallback: sibling AgenticOps layout `../../products/wisptools/...` from Chrysalis repo root.
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../..");

/**
 * @param {string} [override]
 * @returns {string}
 */
export function resolveWispModuleRoot(override) {
  const candidates = [
    override,
    process.env.CHRYSALIS_WISP_MODULE_ROOT,
    join(REPO_ROOT, "../../products/wisptools/Module_Manager"),
    join(REPO_ROOT, "../wisptools/Module_Manager"),
  ].filter(Boolean);
  for (const c of candidates) {
    const p = resolve(String(c));
    if (existsSync(p)) return p;
  }
  return resolve(
    String(
      process.env.CHRYSALIS_WISP_MODULE_ROOT ||
        join(REPO_ROOT, "../../products/wisptools/Module_Manager"),
    ),
  );
}

/**
 * @param {string} [override]
 * @returns {string}
 */
export function resolveWispBackendRoot(override) {
  const candidates = [
    override,
    process.env.CHRYSALIS_WISP_BACKEND_ROOT,
    join(REPO_ROOT, "../../products/wisptools/backend-services"),
    join(REPO_ROOT, "../wisptools/backend-services"),
  ].filter(Boolean);
  for (const c of candidates) {
    const p = resolve(String(c));
    if (existsSync(p)) return p;
  }
  return resolve(
    String(
      process.env.CHRYSALIS_WISP_BACKEND_ROOT ||
        join(REPO_ROOT, "../../products/wisptools/backend-services"),
    ),
  );
}

export { REPO_ROOT as CHRYSALIS_REPO_ROOT };
