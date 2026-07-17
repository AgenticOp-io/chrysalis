#!/usr/bin/env node
/**
 * Sync wisp-api-paths.json from backend-services server mount points (D6442/D6444).
 * Translates Express `app.use('/api/...')` registrations into the CWL API manifest —
 * does not invent routes that are not mounted.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const SYNC_API_PATHS_KIND = "chrysalis.wisp.sync-api-paths";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const defaultManifest = join(scriptRoot, "fixtures/hub-wisp-management/wisp-api-paths.json");

/**
 * @param {string} serverJs
 * @returns {Array<{ path: string, source: string }>}
 */
export function extractExpressApiMounts(serverJs) {
  /** @type {Array<{ path: string, source: string }>} */
  const out = [];
  const re =
    /app\.use\(\s*['"](\/api[^'"]*|\/admin[^'"]*|\/setup-admin[^'"]*)['"]\s*,\s*require\(\s*['"](\.\/[^'"]+)['"]\s*\)/g;
  let m;
  while ((m = re.exec(serverJs)) !== null) {
    out.push({ path: m[1], source: m[2].replace(/^\.\//, "") });
  }
  // Also catch registerBrandingRoutes style — branding may use helper; skip unless explicit.
  return out;
}

/**
 * @param {object} [opts]
 */
export function syncWispApiPathsFromBackend(opts = {}) {
  const backendRoot = resolve(
    opts.backendRoot ??
      process.env.CHRYSALIS_WISP_BACKEND ??
      join(
        process.env.CHRYSALIS_WISP_ROOT ??
          process.env.WISP_MODULE_DIR ??
          "C:/Users/david/AgenticOps/products/wisptools/Module_Manager",
        "..",
        "backend-services",
      ),
  );
  const serverPath = join(backendRoot, "server.js");
  const manifestPath = resolve(opts.manifestPath ?? defaultManifest);
  if (!existsSync(serverPath)) {
    return { kind: SYNC_API_PATHS_KIND, schemaVersion: 1, ok: false, skip: "missing-server-js", backendRoot };
  }
  if (!existsSync(manifestPath)) {
    return { kind: SYNC_API_PATHS_KIND, schemaVersion: 1, ok: false, skip: "missing-manifest" };
  }

  const mounts = extractExpressApiMounts(readFileSync(serverPath, "utf8"));
  // branding-api registers via helper, not app.use('/api/branding', …)
  mounts.push({ path: "/api/branding", source: "routes/branding-api.js" });
  // setup-admin is a real Express mount (not under /api) — still convert as native CWL.
  if (!mounts.some((m) => m.path === "/setup-admin")) {
    mounts.push({ path: "/setup-admin", source: "routes/setup" });
  }
  const prev = JSON.parse(readFileSync(manifestPath, "utf8"));
  /** @type {Map<string, object>} */
  const byPath = new Map();
  for (const p of prev.paths ?? []) {
    byPath.set(p.path, { ...p });
  }

  let added = 0;
  let updated = 0;
  for (const mount of mounts) {
    const id = mount.path
      .replace(/^\/api\/?/, "")
      .replace(/^\//, "")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .toUpperCase() || "API_ROOT";
    const existing = byPath.get(mount.path);
    if (existing) {
      const next = {
        ...existing,
        sourceFile: mount.source,
        note: existing.note ?? `backend ${mount.source}`,
      };
      byPath.set(mount.path, next);
      updated++;
    } else {
      byPath.set(mount.path, {
        id,
        path: mount.path,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        sourceFile: mount.source,
        note: `synced from server.js → ${mount.source}`,
      });
      added++;
    }
  }

  const paths = [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
  const out = {
    ...prev,
    kind: prev.kind ?? "chrysalis.wisp.api-paths",
    schemaVersion: prev.schemaVersion ?? 1,
    source: "Module_Manager/src/lib/config/api.ts + backend-services/server.js mounts",
    syncedAt: new Date().toISOString(),
    backendRoot: backendRoot.replace(/\\/g, "/"),
    paths,
  };
  writeFileSync(manifestPath, `${JSON.stringify(out, null, 2)}\n`, "utf8");
  return {
    kind: SYNC_API_PATHS_KIND,
    schemaVersion: 1,
    ok: true,
    manifestPath,
    mountCount: mounts.length,
    pathCount: paths.length,
    added,
    updated,
    generatedAt: out.syncedAt,
  };
}

function main() {
  const r = syncWispApiPathsFromBackend();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("sync-api-paths-from-backend")) main();
