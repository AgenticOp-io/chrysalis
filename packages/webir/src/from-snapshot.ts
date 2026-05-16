import type { Locator, Module, NodeBase, NodeId, Provenance, WebIRType } from "./index.js";
import { nodeId } from "./index.js";

type GoldenModule = {
  readonly meta: Module["meta"];
  readonly roots: ReadonlyArray<string>;
  readonly nodes: ReadonlyArray<{
    readonly id: string;
    readonly dialect: string;
    readonly op: string;
    readonly type: WebIRType;
    readonly effects: NodeBase["effects"];
    readonly operands: ReadonlyArray<string>;
    readonly attrs: Readonly<Record<string, unknown>>;
    readonly origin: Locator;
    readonly provenance: ReadonlyArray<{
      readonly source: string;
      readonly locator: Locator;
      readonly reason: string;
    }>;
  }>;
};

function asProvenance(p: GoldenModule["nodes"][number]["provenance"][number]): Provenance {
  return {
    source: p.source as Provenance["source"],
    locator: p.locator,
    reason: p.reason,
  };
}

/** Load a {@link moduleToGoldenSnapshot} JSON document into an in-memory {@link Module}. */
export function moduleFromGoldenSnapshot(json: string | GoldenModule): Module {
  const data: GoldenModule = typeof json === "string" ? (JSON.parse(json) as GoldenModule) : json;
  if (!data?.meta || !Array.isArray(data.nodes) || !Array.isArray(data.roots)) {
    throw new Error("moduleFromGoldenSnapshot: expected meta, nodes, roots");
  }
  const nodes = new Map<NodeId, NodeBase>();
  for (const raw of data.nodes) {
    const id = nodeId(raw.id);
    nodes.set(id, {
      id,
      dialect: raw.dialect,
      op: raw.op,
      type: raw.type,
      effects: raw.effects,
      operands: raw.operands.map((o: string) => nodeId(o)),
      attrs: raw.attrs,
      origin: raw.origin,
      provenance: raw.provenance.map(asProvenance),
    });
  }
  return {
    meta: data.meta,
    roots: data.roots.map((r) => nodeId(r)),
    nodes,
  };
}
