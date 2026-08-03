#!/usr/bin/env node
/**
 * Sync wisp-api-paths.json from backend-services server mount points (D6442/D6444).
 * Translates Express `app.use('/api/...')` registrations into the CWL API manifest —
 * does not invent routes that are not mounted.
 */
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveWispModuleRoot, resolveWispBackendRoot } from "./wisp-origin-paths.mjs";

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

function resolveRouteModule(backendRoot, fromFile, request) {
  if (!request?.startsWith(".")) return null;
  const base = resolve(dirname(fromFile), request);
  const candidates = extname(base)
    ? [base]
    : [base, `${base}.js`, join(base, "index.js")];
  return (
    candidates.find(
      (candidate) => existsSync(candidate) && statSync(candidate).isFile(),
    ) ?? null
  );
}

function joinRoutePath(prefix, child) {
  const left = String(prefix || "").replace(/\/+$/, "");
  const right = String(child || "").replace(/^\/+/, "");
  if (!right) return left || "/";
  return `${left}/${right}`.replace(/\/+/g, "/");
}

/**
 * Recursively extract concrete Express router methods beneath one app mount.
 * Supports direct router verbs and `router.use(prefix, importedRouter)`.
 * @param {string} backendRoot
 * @param {string} mountPath
 * @param {string} sourceFile
 * @param {Set<string>} [seen]
 */
export function extractExpressRouterRoutes(
  backendRoot,
  mountPath,
  sourceFile,
  seen = new Set(),
) {
  const abs = resolveRouteModule(backendRoot, join(backendRoot, "server.js"), `./${sourceFile}`);
  if (!abs || seen.has(`${abs}|${mountPath}`)) return [];
  seen.add(`${abs}|${mountPath}`);
  const raw = readFileSync(abs, "utf8");
  const out = [];

  const verbRe = /\brouter\.(get|post|put|patch|delete)\(\s*(['"`])([^'"`]+)\2/g;
  let match;
  while ((match = verbRe.exec(raw)) !== null) {
    out.push({
      path: joinRoutePath(mountPath, match[3]),
      method: match[1].toUpperCase(),
      source: abs.slice(backendRoot.length + 1).replace(/\\/g, "/"),
    });
  }

  const imports = new Map();
  const importRe =
    /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*require\(\s*(['"])(\.[^'"]+)\2\s*\)/g;
  while ((match = importRe.exec(raw)) !== null) imports.set(match[1], match[3]);

  const useRe =
    /\brouter\.use\(\s*(['"`])([^'"`]*)\1\s*,\s*([A-Za-z_$][\w$]*)\s*\)/g;
  while ((match = useRe.exec(raw)) !== null) {
    const request = imports.get(match[3]);
    if (!request) continue;
    const childAbs = resolveRouteModule(backendRoot, abs, request);
    if (!childAbs) continue;
    const childSource = childAbs.slice(backendRoot.length + 1).replace(/\\/g, "/");
    out.push(
      ...extractExpressRouterRoutes(
        backendRoot,
        joinRoutePath(mountPath, match[2]),
        childSource,
        seen,
      ),
    );
  }
  return out;
}

/**
 * @param {object} [opts]
 */
export function syncWispApiPathsFromBackend(opts = {}) {
  const backendRoot = resolve(
    opts.backendRoot ??
      process.env.CHRYSALIS_WISP_BACKEND ??
      process.env.CHRYSALIS_WISP_BACKEND_ROOT ??
      resolveWispBackendRoot(),
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

  const concreteRoutes = mounts.flatMap((mount) =>
    extractExpressRouterRoutes(backendRoot, mount.path, mount.source),
  );
  const concreteByPath = new Map();
  for (const route of concreteRoutes) {
    const row = concreteByPath.get(route.path) ?? {
      path: route.path,
      sourceFile: route.source,
      methods: [],
    };
    if (!row.methods.includes(route.method)) row.methods.push(route.method);
    concreteByPath.set(route.path, row);
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
  for (const route of concreteByPath.values()) {
    const id =
      route.path
        .replace(/^\/api\/?/, "")
        .replace(/^\//, "")
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .toUpperCase() || "API_ROOT";
    const existing = byPath.get(route.path);
    byPath.set(route.path, {
      ...(existing ?? {}),
      id: existing?.id ?? id,
      path: route.path,
      methods: route.methods.sort(),
      sourceFile: route.sourceFile,
      note: `extracted from ${route.sourceFile}`,
    });
    if (existing) updated++;
    else added++;
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
    concreteRouteCount: concreteRoutes.length,
    concretePathCount: concreteByPath.size,
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
