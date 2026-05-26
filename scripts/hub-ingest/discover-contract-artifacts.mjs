/**
 * Find OpenAPI/Swagger/HAR inputs under a site tree (contract-first silver path, G20).
 */
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const OPENAPI_RE = /^(openapi|swagger)\.(json|ya?ml)$/i;
const OPENAPI_SUFFIX_RE = /\.openapi\.(json|ya?ml)$/i;
const HAR_RE = /\.har\.json$/i;

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "vendor",
  "generated",
  ".chrysalis",
  "dist",
  "build",
  ".next",
]);

/**
 * @param {string} root
 * @param {{ maxDepth?: number, maxHits?: number }} [opts]
 */
export async function discoverContractArtifacts(root, opts = {}) {
  const maxDepth = opts.maxDepth ?? 12;
  const maxHits = opts.maxHits ?? 8;
  const openapis = [];
  const hars = [];

  async function walk(dir, depth) {
    if (depth > maxDepth || (openapis.length + hars.length) >= maxHits) return;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      if (openapis.length + hars.length >= maxHits) return;
      const p = join(dir, ent.name);
      if (ent.isDirectory()) {
        if (SKIP_DIRS.has(ent.name)) continue;
        await walk(p, depth + 1);
        continue;
      }
      if (!ent.isFile()) continue;
      const name = ent.name;
      if (OPENAPI_RE.test(name) || OPENAPI_SUFFIX_RE.test(name)) {
        openapis.push(p);
      } else if (HAR_RE.test(name)) {
        hars.push(p);
      }
    }
  }

  try {
    const st = await stat(root);
    if (!st.isDirectory()) {
      return { openapis: [], hars: [], openapi: null, har: null };
    }
  } catch {
    return { openapis: [], hars: [], openapi: null, har: null };
  }

  await walk(root, 0);
  openapis.sort((a, b) => a.length - b.length);
  hars.sort((a, b) => a.length - b.length);
  return {
    openapis,
    hars,
    openapi: openapis[0] ?? null,
    har: hars[0] ?? null,
  };
}
