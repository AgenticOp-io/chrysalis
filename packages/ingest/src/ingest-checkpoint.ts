import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Module } from "@chrysalis/webir";
import { deserializeModuleCheckpoint, serializeModuleCheckpoint } from "@chrysalis/webir";
import { fingerprintIngestRouteList } from "./ingest-progress.js";
import type { RouteSpec } from "./routes.js";

export const INGEST_CHECKPOINT_ENVELOPE_KIND = "chrysalis.ingest.checkpoint" as const;
export const INGEST_CHECKPOINT_ENVELOPE_SCHEMA_VERSION = 1 as const;

export interface IngestCheckpointEnvelopeV1 {
  readonly kind: typeof INGEST_CHECKPOINT_ENVELOPE_KIND;
  readonly schemaVersion: typeof INGEST_CHECKPOINT_ENVELOPE_SCHEMA_VERSION;
  readonly manifestRouteFingerprint: string;
  readonly shardFilter?: { readonly shardIndex: number; readonly shardCount: number };
  readonly completedRouteKeys: readonly string[];
  readonly moduleJson: string;
}

function writeAtomic(path: string, body: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, body, "utf8");
  renameSync(tmp, path);
}

export function writeIngestCheckpointEnvelope(
  path: string,
  input: {
    readonly routes: readonly RouteSpec[];
    readonly shardFilter?: { readonly shardIndex: number; readonly shardCount: number };
    readonly completedRouteKeys: readonly string[];
    readonly module: Module;
  },
): void {
  const manifestRouteFingerprint = fingerprintIngestRouteList(input.routes);
  const envelope: IngestCheckpointEnvelopeV1 = {
    kind: INGEST_CHECKPOINT_ENVELOPE_KIND,
    schemaVersion: INGEST_CHECKPOINT_ENVELOPE_SCHEMA_VERSION,
    manifestRouteFingerprint,
    ...(input.shardFilter !== undefined ? { shardFilter: input.shardFilter } : {}),
    completedRouteKeys: [...input.completedRouteKeys],
    moduleJson: serializeModuleCheckpoint(input.module),
  };
  writeAtomic(path, `${JSON.stringify(envelope, null, 2)}\n`);
}

export type ReadIngestCheckpointResult =
  | {
      ok: true;
      value: {
        readonly manifestRouteFingerprint: string;
        readonly shardFilter?: { readonly shardIndex: number; readonly shardCount: number };
        /** Route keys in completion order (matches ingest iteration order). */
        readonly completedRouteKeys: readonly string[];
        readonly module: Module;
      };
    }
  | { ok: false; error: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

export function readIngestCheckpointEnvelope(path: string): ReadIngestCheckpointResult {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (e) {
    return {
      ok: false,
      error: `ingest checkpoint: cannot read ${path}: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (e) {
    return { ok: false, error: `ingest checkpoint: invalid JSON (${e instanceof Error ? e.message : String(e)})` };
  }
  if (!isRecord(parsed)) return { ok: false, error: "ingest checkpoint: top-level must be object" };
  if (parsed.kind !== INGEST_CHECKPOINT_ENVELOPE_KIND) {
    return { ok: false, error: `ingest checkpoint: expected kind ${INGEST_CHECKPOINT_ENVELOPE_KIND}` };
  }
  if (parsed.schemaVersion !== INGEST_CHECKPOINT_ENVELOPE_SCHEMA_VERSION) {
    return { ok: false, error: `ingest checkpoint: unsupported schemaVersion ${String(parsed.schemaVersion)}` };
  }
  if (
    typeof parsed.manifestRouteFingerprint !== "string" ||
    !/^[a-f0-9]{64}$/i.test(parsed.manifestRouteFingerprint)
  ) {
    return { ok: false, error: "ingest checkpoint: manifestRouteFingerprint must be sha256 hex" };
  }
  if (!Array.isArray(parsed.completedRouteKeys)) {
    return { ok: false, error: "ingest checkpoint: completedRouteKeys must be array" };
  }
  for (const k of parsed.completedRouteKeys) {
    if (typeof k !== "string") return { ok: false, error: "ingest checkpoint: completedRouteKeys must be strings" };
  }
  let shardFilter: { readonly shardIndex: number; readonly shardCount: number } | undefined;
  if (parsed.shardFilter !== undefined) {
    if (!isRecord(parsed.shardFilter)) return { ok: false, error: "ingest checkpoint: shardFilter must be object" };
    const si = parsed.shardFilter.shardIndex;
    const sc = parsed.shardFilter.shardCount;
    if (typeof si !== "number" || typeof sc !== "number" || !Number.isInteger(si) || !Number.isInteger(sc)) {
      return { ok: false, error: "ingest checkpoint: shardFilter.shardIndex/shardCount must be integers" };
    }
    shardFilter = { shardIndex: si, shardCount: sc };
  }
  if (typeof parsed.moduleJson !== "string") {
    return { ok: false, error: "ingest checkpoint: moduleJson must be string" };
  }
  let module: Module;
  try {
    module = deserializeModuleCheckpoint(parsed.moduleJson);
  } catch (e) {
    return {
      ok: false,
      error: `ingest checkpoint: moduleJson: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
  return {
    ok: true,
    value: {
      manifestRouteFingerprint: parsed.manifestRouteFingerprint,
      ...(shardFilter !== undefined ? { shardFilter } : {}),
      completedRouteKeys: parsed.completedRouteKeys as string[],
      module,
    },
  };
}

export function stableRouteFingerprintMatches(routes: readonly RouteSpec[], fp: string): boolean {
  return fingerprintIngestRouteList(routes) === fp;
}
