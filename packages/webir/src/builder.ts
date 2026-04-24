import type {
  Effect,
  EffectSet,
  Locator,
  Module,
  NodeBase,
  NodeId,
  Provenance,
  WebIRType,
} from "./index.js";
import { IdGen } from "./ids.js";

export interface ModuleBuilderOpts {
  readonly sourceApp: string;
  readonly chrysalisVersion?: string;
}

/**
 * Mutable builder for a WebIR Module. Emits an immutable `Module` on `finish`.
 * Every node gets a deterministic id from the internal `IdGen`.
 */
export class ModuleBuilder {
  readonly ids: IdGen;
  readonly #nodes = new Map<NodeId, NodeBase>();
  readonly #roots: NodeId[] = [];
  readonly #opts: ModuleBuilderOpts;

  constructor(opts: ModuleBuilderOpts) {
    this.ids = new IdGen("n");
    this.#opts = opts;
  }

  node(n: Omit<NodeBase, "id"> & { id?: NodeId }): NodeId {
    const id = n.id ?? this.ids.alloc();
    const full: NodeBase = {
      id,
      dialect: n.dialect,
      op: n.op,
      type: n.type,
      effects: n.effects,
      operands: n.operands,
      attrs: n.attrs,
      origin: n.origin,
      provenance: n.provenance,
    };
    this.#nodes.set(id, full);
    return id;
  }

  addRoot(id: NodeId): void {
    this.#roots.push(id);
  }

  has(id: NodeId): boolean {
    return this.#nodes.has(id);
  }

  get(id: NodeId): NodeBase {
    const n = this.#nodes.get(id);
    if (!n) throw new Error(`webir: unknown NodeId ${String(id)}`);
    return n;
  }

  finish(): Module {
    return {
      nodes: new Map(this.#nodes),
      roots: [...this.#roots],
      meta: {
        sourceApp: this.#opts.sourceApp,
        createdAt: new Date(0).toISOString(),
        chrysalisVersion: this.#opts.chrysalisVersion ?? "0.0.0",
      },
    };
  }
}

export const NO_EFFECTS: EffectSet = Object.freeze([]);

export function mergeEffects(...sets: EffectSet[]): EffectSet {
  const seen = new Set<string>();
  const out: EffectSet[number][] = [];
  for (const s of sets) {
    for (const e of s) {
      const k = JSON.stringify(e);
      if (!seen.has(k)) {
        seen.add(k);
        out.push(e);
      }
    }
  }
  return Object.freeze(out);
}

/** Stable string tag for an effect (matches CLI / ingest expectations). */
export function effectTag(e: Effect): string {
  return "table" in e ? `${e.kind}:${e.table}` : e.kind;
}

/** Sorted tags for a handler-level or merged effect list. */
export function effectTagsSorted(effects: EffectSet): readonly string[] {
  return Object.freeze([...effects].map(effectTag).sort());
}

/**
 * Union every non-empty {@link NodeBase.effects} on nodes reachable from
 * `root` via `operands` (cycle-safe). Used to populate `web.request` handler
 * effect lists from the handler body subgraph.
 */
export function effectsReachableFrom(
  getNode: (id: NodeId) => NodeBase | undefined,
  root: NodeId,
): EffectSet {
  const seen = new Set<NodeId>();
  const stacks: EffectSet[] = [];
  const visit = (id: NodeId): void => {
    if (seen.has(id)) return;
    seen.add(id);
    const n = getNode(id);
    if (!n) return;
    if (n.effects.length > 0) stacks.push(n.effects);
    for (const child of n.operands) visit(child);
  };
  visit(root);
  return mergeEffects(...stacks);
}

export function synthetic(reason: string): Locator {
  return { kind: "synthetic", reason };
}

export function phpLocator(file: string, line: number, col: number): Locator {
  return { kind: "php", file, line, col };
}

export function provenance(
  source: Provenance["source"],
  locator: Locator,
  reason: string,
): Provenance {
  return { source, locator, reason };
}

/** Narrow WebIRType constructors for frontends/backends. */
export const T = {
  unknown: { kind: "unknown" } as const satisfies WebIRType,
  void: { kind: "void" } as const satisfies WebIRType,
  null: { kind: "null" } as const satisfies WebIRType,
  bool: { kind: "bool" } as const satisfies WebIRType,
  int: { kind: "int" } as const satisfies WebIRType,
  float: { kind: "float" } as const satisfies WebIRType,
  string: { kind: "string" } as const satisfies WebIRType,
  named: (name: string) => ({ kind: "named", name }) as const satisfies WebIRType,
  array: (element: WebIRType) =>
    ({ kind: "array", element }) as const satisfies WebIRType,
  record: (fields: Record<string, WebIRType>) =>
    ({ kind: "record", fields }) as const satisfies WebIRType,
  nullable: (inner: WebIRType) =>
    ({ kind: "nullable", inner }) as const satisfies WebIRType,
  literal: (value: string | number | boolean) =>
    ({ kind: "literal", value }) as const satisfies WebIRType,
  union: (members: ReadonlyArray<WebIRType>) =>
    ({ kind: "union", members }) as const satisfies WebIRType,
  hole: (input: WebIRType, output: WebIRType) =>
    ({ kind: "hole", contract: { input, output } }) as const satisfies WebIRType,
};
