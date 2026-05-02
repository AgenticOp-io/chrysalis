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

export type ParseIngestProgressResult =
  | { ok: true; value: IngestProgressStateV0 }
  | { ok: false; error: string };

function isSha256Hex(s: string): boolean {
  return /^[a-f0-9]{64}$/i.test(s);
}

/**
 * Validate **`chrysalis.ingest.progress`** JSON (e.g. operator scripts, offline checks).
 * Does not read from disk; see {@link readIngestProgressFile}.
 */
export function parseIngestProgressJson(raw: string): ParseIngestProgressResult {
  let j: unknown;
  try {
    j = JSON.parse(raw) as unknown;
  } catch {
    return { ok: false, error: "invalid JSON" };
  }
  if (typeof j !== "object" || j === null || Array.isArray(j)) {
    return { ok: false, error: "root must be a JSON object" };
  }
  const o = j as Record<string, unknown>;
  if (o.kind !== INGEST_PROGRESS_KIND) {
    return { ok: false, error: `kind must be ${JSON.stringify(INGEST_PROGRESS_KIND)}` };
  }
  if (o.schemaVersion !== INGEST_PROGRESS_SCHEMA_VERSION) {
    return { ok: false, error: `schemaVersion must be ${String(INGEST_PROGRESS_SCHEMA_VERSION)}` };
  }
  if (typeof o.toolVersion !== "string" || o.toolVersion.length === 0) {
    return { ok: false, error: "toolVersion must be a non-empty string" };
  }
  if (typeof o.manifestRouteFingerprint !== "string" || !isSha256Hex(o.manifestRouteFingerprint)) {
    return { ok: false, error: "manifestRouteFingerprint must be a 64-character hex SHA-256 digest" };
  }
  if (typeof o.sourceApp !== "string" || o.sourceApp.length === 0) {
    return { ok: false, error: "sourceApp must be a non-empty string" };
  }
  if (typeof o.projectRoot !== "string" || o.projectRoot.length === 0) {
    return { ok: false, error: "projectRoot must be a non-empty string" };
  }
  if (!Array.isArray(o.completedRouteKeys)) {
    return { ok: false, error: "completedRouteKeys must be an array" };
  }
  for (const k of o.completedRouteKeys) {
    if (typeof k !== "string" || k.length === 0) {
      return { ok: false, error: "completedRouteKeys must contain only non-empty strings" };
    }
  }
  if (typeof o.updatedAt !== "string" || o.updatedAt.length === 0) {
    return { ok: false, error: "updatedAt must be a non-empty string" };
  }
  let shardFilter: IngestProgressStateV0["shardFilter"];
  if (o.shardFilter !== undefined) {
    const sf = o.shardFilter;
    if (typeof sf !== "object" || sf === null || Array.isArray(sf)) {
      return { ok: false, error: "shardFilter must be an object when set" };
    }
    const sfo = sf as Record<string, unknown>;
    if (typeof sfo.shardIndex !== "number" || !Number.isInteger(sfo.shardIndex)) {
      return { ok: false, error: "shardFilter.shardIndex must be an integer" };
    }
    if (typeof sfo.shardCount !== "number" || !Number.isInteger(sfo.shardCount)) {
      return { ok: false, error: "shardFilter.shardCount must be an integer" };
    }
    if (sfo.shardCount < 2) {
      return { ok: false, error: "shardFilter.shardCount must be >= 2" };
    }
    if (sfo.shardIndex < 0 || sfo.shardIndex >= sfo.shardCount) {
      return { ok: false, error: "shardFilter.shardIndex must satisfy 0 <= index < shardCount" };
    }
    shardFilter = { shardIndex: sfo.shardIndex, shardCount: sfo.shardCount };
  }
  const value: IngestProgressStateV0 = {
    kind: INGEST_PROGRESS_KIND,
    schemaVersion: INGEST_PROGRESS_SCHEMA_VERSION,
    toolVersion: o.toolVersion,
    manifestRouteFingerprint: o.manifestRouteFingerprint.toLowerCase(),
    sourceApp: o.sourceApp,
    projectRoot: o.projectRoot,
    completedRouteKeys: o.completedRouteKeys as string[],
    updatedAt: o.updatedAt,
    ...(shardFilter !== undefined ? { shardFilter } : {}),
  };
  return { ok: true, value };
}

/**
 * Read and strictly validate a progress file from disk.
 */
export function readIngestProgressFile(path: string): ParseIngestProgressResult {
  try {
    const raw = readFileSync(path, "utf8");
    return parseIngestProgressJson(raw);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `read failed: ${msg}` };
  }
}

function loadExisting(path: string): IngestProgressStateV0 | null {
  const r = readIngestProgressFile(path);
  return r.ok ? r.value : null;
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
