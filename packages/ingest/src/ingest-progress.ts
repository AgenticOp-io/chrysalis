/**
 * Optional per-route progress JSON for long monolithic ingests (V2-M2).
 * Diagnostic / crash-forensics only: does not skip work or replace `--ingest-cache` / sharding.
 */

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const INGEST_PROGRESS_KIND = "chrysalis.ingest.progress" as const;
export const INGEST_PROGRESS_SCHEMA_VERSION = 0 as const;

export interface IngestProgressStateV0 {
  readonly kind: typeof INGEST_PROGRESS_KIND;
  readonly schemaVersion: typeof INGEST_PROGRESS_SCHEMA_VERSION;
  readonly toolVersion: string;
  /** SHA-256 (hex) of the canonical JSON for the route list in this ingest run (after shard filter). */
  readonly manifestRouteFingerprint: string;
  readonly sourceApp: string;
  readonly projectRoot: string;
  readonly completedRouteKeys: readonly string[];
  readonly updatedAt: string;
  readonly shardFilter?: { readonly shardIndex: number; readonly shardCount: number };
}

export function routeKeyForIngestProgress(route: { method: string; path: string }): string {
  return `${route.method.toUpperCase()} ${route.path}`;
}

function stableRouteListForFingerprint(
  routes: ReadonlyArray<{ method: string; path: string; file: string }>,
): string {
  const rows = routes
    .map((r) => ({
      method: r.method.toUpperCase(),
      path: r.path,
      file: r.file.replace(/\\/g, "/"),
    }))
    .sort((a, b) => {
      const ka = `${a.method} ${a.path}`;
      const kb = `${b.method} ${b.path}`;
      return ka.localeCompare(kb);
    });
  return JSON.stringify(rows);
}

export function fingerprintIngestRouteList(
  routes: ReadonlyArray<{ method: string; path: string; file: string }>,
): string {
  return createHash("sha256").update(stableRouteListForFingerprint(routes), "utf8").digest("hex");
}

function readIngestPackageVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const pkgPath = join(here, "..", "package.json");
    const raw = readFileSync(pkgPath, "utf8");
    return (JSON.parse(raw) as { version: string }).version;
  } catch {
    return "0.0.0";
  }
}

function writeAtomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(tmp, path);
}

function loadExisting(path: string): IngestProgressStateV0 | null {
  try {
    const raw = readFileSync(path, "utf8");
    const j = JSON.parse(raw) as Partial<IngestProgressStateV0>;
    if (j?.kind !== INGEST_PROGRESS_KIND || j.schemaVersion !== INGEST_PROGRESS_SCHEMA_VERSION) {
      return null;
    }
    if (typeof j.manifestRouteFingerprint !== "string" || !Array.isArray(j.completedRouteKeys)) {
      return null;
    }
    return j as IngestProgressStateV0;
  } catch {
    return null;
  }
}

/**
 * Append one completed route to the progress file (atomic rewrite).
 * If an existing file has a different {@link manifestRouteFingerprint}, completed keys reset.
 */
export function recordIngestRouteProgress(opts: {
  readonly progressFilePath: string;
  readonly projectRoot: string;
  readonly sourceApp: string;
  readonly manifestRouteFingerprint: string;
  readonly routeKey: string;
  readonly shardFilter?: { readonly shardIndex: number; readonly shardCount: number };
}): void {
  const prev = loadExisting(opts.progressFilePath);
  const keys = new Set<string>();
  if (prev && prev.manifestRouteFingerprint === opts.manifestRouteFingerprint) {
    for (const k of prev.completedRouteKeys) keys.add(k);
  }
  keys.add(opts.routeKey);

  const state: IngestProgressStateV0 = {
    kind: INGEST_PROGRESS_KIND,
    schemaVersion: INGEST_PROGRESS_SCHEMA_VERSION,
    toolVersion: readIngestPackageVersion(),
    manifestRouteFingerprint: opts.manifestRouteFingerprint,
    sourceApp: opts.sourceApp,
    projectRoot: opts.projectRoot.replace(/\\/g, "/"),
    completedRouteKeys: [...keys].sort(),
    updatedAt: new Date().toISOString(),
    ...(opts.shardFilter !== undefined ? { shardFilter: opts.shardFilter } : {}),
  };
  writeAtomicJson(opts.progressFilePath, state);
}
