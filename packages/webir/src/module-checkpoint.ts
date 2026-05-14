/**
 * JSON checkpoint serialization for {@link Module} (ingest resume).
 * Intentionally separate from golden snapshots (path relativization differs).
 */

import type { Module, NodeBase, NodeId } from "./index.js";
import { nodeId } from "./index.js";

export const MODULE_CHECKPOINT_KIND = "chrysalis.module.checkpoint" as const;
export const MODULE_CHECKPOINT_SCHEMA_VERSION = 1 as const;

export interface ModuleCheckpointV1 {
  readonly kind: typeof MODULE_CHECKPOINT_KIND;
  readonly schemaVersion: typeof MODULE_CHECKPOINT_SCHEMA_VERSION;
  readonly meta: Module["meta"];
  readonly roots: readonly string[];
  readonly nodes: Readonly<Record<string, NodeBase>>;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function expectNodeBase(n: unknown, path: string): asserts n is NodeBase {
  if (!isRecord(n)) throw new Error(`${path}: expected object`);
  if (typeof n.id !== "string") throw new Error(`${path}.id: expected string`);
  if (typeof n.dialect !== "string") throw new Error(`${path}.dialect: expected string`);
  if (typeof n.op !== "string") throw new Error(`${path}.op: expected string`);
  if (n.type === undefined || n.type === null) throw new Error(`${path}.type: missing`);
  if (!Array.isArray(n.effects)) throw new Error(`${path}.effects: expected array`);
  if (!Array.isArray(n.operands)) throw new Error(`${path}.operands: expected array`);
  if (!isRecord(n.attrs)) throw new Error(`${path}.attrs: expected object`);
  if (n.origin === undefined || n.origin === null) throw new Error(`${path}.origin: missing`);
  if (!Array.isArray(n.provenance)) throw new Error(`${path}.provenance: expected array`);
}

export function serializeModuleCheckpoint(mod: Module): string {
  const nodes: Record<string, NodeBase> = {};
  for (const [id, n] of mod.nodes) {
    nodes[String(id)] = n;
  }
  const payload: ModuleCheckpointV1 = {
    kind: MODULE_CHECKPOINT_KIND,
    schemaVersion: MODULE_CHECKPOINT_SCHEMA_VERSION,
    meta: mod.meta,
    roots: mod.roots.map((r) => String(r)),
    nodes,
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function deserializeModuleCheckpoint(json: string): Module {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json) as unknown;
  } catch (e) {
    throw new Error(`module checkpoint: invalid JSON (${e instanceof Error ? e.message : String(e)})`);
  }
  if (!isRecord(parsed)) throw new Error("module checkpoint: top-level must be object");
  if (parsed.kind !== MODULE_CHECKPOINT_KIND) {
    throw new Error(`module checkpoint: expected kind ${MODULE_CHECKPOINT_KIND}`);
  }
  if (parsed.schemaVersion !== MODULE_CHECKPOINT_SCHEMA_VERSION) {
    throw new Error(`module checkpoint: unsupported schemaVersion ${String(parsed.schemaVersion)}`);
  }
  if (!isRecord(parsed.meta)) throw new Error("module checkpoint: meta must be object");
  const sourceApp = parsed.meta.sourceApp;
  const createdAt = parsed.meta.createdAt;
  const chrysalisVersion = parsed.meta.chrysalisVersion;
  if (typeof sourceApp !== "string" || typeof createdAt !== "string" || typeof chrysalisVersion !== "string") {
    throw new Error("module checkpoint: meta.sourceApp, createdAt, chrysalisVersion must be strings");
  }
  if (!Array.isArray(parsed.roots)) throw new Error("module checkpoint: roots must be array");
  if (!isRecord(parsed.nodes)) throw new Error("module checkpoint: nodes must be object");

  const nodes = new Map<NodeId, NodeBase>();
  for (const [key, raw] of Object.entries(parsed.nodes)) {
    expectNodeBase(raw, `nodes[${key}]`);
    const nb = raw as NodeBase;
    nodes.set(nodeId(String(nb.id)), {
      ...nb,
      id: nodeId(String(nb.id)),
      operands: nb.operands.map((o) => nodeId(String(o))),
    });
  }

  const roots = parsed.roots.map((r) => {
    if (typeof r !== "string") throw new Error("module checkpoint: each root must be string");
    return nodeId(r);
  });

  for (const r of roots) {
    if (!nodes.has(r)) throw new Error(`module checkpoint: root ${String(r)} missing from nodes map`);
  }

  return {
    nodes,
    roots,
    meta: { sourceApp, createdAt, chrysalisVersion },
  };
}
