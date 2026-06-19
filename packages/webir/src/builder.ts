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

/**
 * Rebuild a mutable {@link ModuleBuilder} from a finished {@link Module} so new
 * roots can be appended (ingest checkpoint resume).
 */
export function moduleBuilderResumeFromModule(mod: Module): ModuleBuilder {
  const builder = new ModuleBuilder({
    sourceApp: mod.meta.sourceApp,
    chrysalisVersion: mod.meta.chrysalisVersion,
  });
  for (const n of mod.nodes.values()) {
    builder.node(n);
  }
  for (const r of mod.roots) {
    builder.addRoot(r);
  }
  builder.ids.seedAfterExistingNodeIds(mod.nodes.keys());
  return builder;
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
  if ("table" in e) return `${e.kind}:${e.table}`;
  if ("callee" in e) return `${e.kind}:${e.callee}`;
  return e.kind;
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

/**
 * Like {@link effectsReachableFrom}, but when visiting a `data.call` node,
 * also unions `callEffects.get(callee)` when present. Used for cross-call
 * widening (e.g. PHP functions in `lib/` ingested separately).
 */
export function effectsReachableWithCallOverlay(
  getNode: (id: NodeId) => NodeBase | undefined,
  root: NodeId,
  callEffects: ReadonlyMap<string, EffectSet>,
): EffectSet {
  const normalizeCallableName = (raw: string): string => raw.trim().replace(/^\\+/, "");
  /** Right-most segment of a normalized `\`-separated PHP symbol (function name). */
  const unqualifiedTail = (norm: string): string => {
    const i = norm.lastIndexOf("\\");
    return i === -1 ? norm : norm.slice(i + 1);
  };
  /**
   * Merge overlay entries that share the same unqualified tail so calls parsed as
   * fully-qualified names (e.g. `\Acme\Helpers\foo`) still match Composer/vendor
   * helpers indexed by short `FunctionDecl` names (`foo`). When several keys
   * collide on one tail, effects are unioned (sound widening).
   */
  const suffixWidened = ((): ReadonlyMap<string, EffectSet> => {
    if (callEffects.size === 0) return new Map();
    const groups = new Map<string, EffectSet[]>();
    for (const [k, eff] of callEffects) {
      if (!eff.length) continue;
      const tail = unqualifiedTail(normalizeCallableName(k));
      if (!tail) continue;
      const list = groups.get(tail) ?? [];
      list.push(eff);
      groups.set(tail, list);
    }
    const out = new Map<string, EffectSet>();
    for (const [tail, list] of groups) {
      out.set(tail, list.length === 1 ? list[0]! : mergeEffects(...list));
    }
    return out;
  })();
  const tryResolveCallableArrayLiteral = (argNode: NodeBase | undefined): string => {
    if (!argNode || argNode.dialect !== "data" || argNode.op !== "call") return "";
    const callee = String((argNode.attrs as { callee?: string }).callee ?? "");
    if (callee !== "__array_literal") return "";
    if (argNode.operands.length < 2) return "";
    const op0 = argNode.operands[0];
    const op1 = argNode.operands[1];
    if (op0 === undefined || op1 === undefined) return "";
    const partA = getNode(op0);
    const partB = getNode(op1);
    const a =
      partA &&
      partA.dialect === "data" &&
      partA.op === "literal" &&
      typeof (partA.attrs as { value?: unknown }).value === "string"
        ? String((partA.attrs as { value: string }).value ?? "")
        : "";
    const b =
      partB &&
      partB.dialect === "data" &&
      partB.op === "literal" &&
      typeof (partB.attrs as { value?: unknown }).value === "string"
        ? String((partB.attrs as { value: string }).value ?? "")
        : "";
    if (!a || !b) return "";
    return `${a}::${b}`;
  };
  const resolveCallableCandidates = (
    node: NodeBase | undefined,
  ): { readonly names: readonly string[]; readonly complete: boolean } => {
    if (!node) return { names: [], complete: false };
    if (node.dialect === "data" && node.op === "literal") {
      const raw = (node.attrs as { value?: unknown }).value;
      return typeof raw === "string" && raw !== ""
        ? { names: [raw], complete: true }
        : { names: [], complete: false };
    }
    if (node.dialect === "data" && node.op === "call") {
      const callee = String((node.attrs as { callee?: string }).callee ?? "");
      if (callee === "__array_literal") {
        const single = tryResolveCallableArrayLiteral(node);
        return single ? { names: [single], complete: true } : { names: [], complete: false };
      }
      if (callee === "__ternary") {
        const thenNode = node.operands[1] ? getNode(node.operands[1]) : undefined;
        const elseNode = node.operands[2] ? getNode(node.operands[2]) : undefined;
        const a = resolveCallableCandidates(thenNode);
        const b = resolveCallableCandidates(elseNode);
        const names = [...new Set([...a.names, ...b.names])];
        return { names, complete: names.length > 0 && a.complete && b.complete };
      }
    }
    if (node.dialect === "data" && node.op === "binop") {
      const operator = String((node.attrs as { operator?: unknown }).operator ?? "");
      if (operator === "??") {
        const left = node.operands[0] ? getNode(node.operands[0]) : undefined;
        const right = node.operands[1] ? getNode(node.operands[1]) : undefined;
        const a = resolveCallableCandidates(left);
        const b = resolveCallableCandidates(right);
        const names = [...new Set([...a.names, ...b.names])];
        return { names, complete: names.length > 0 && a.complete && b.complete };
      }
    }
    return { names: [], complete: false };
  };
  const tryPushNamedCalleeEffects = (raw: string): boolean => {
    const name = normalizeCallableName(raw);
    if (!name) return false;
    const extra = callEffects.get(name);
    if (extra && extra.length > 0) {
      stacks.push(extra);
      return true;
    }
    const tail = unqualifiedTail(name);
    if (!tail) return false;
    const widened = suffixWidened.get(tail);
    if (widened && widened.length > 0) {
      stacks.push(widened);
      return true;
    }
    return false;
  };
  const pushAllOverlayEffects = (): void => {
    for (const eff of callEffects.values()) {
      if (eff.length > 0) stacks.push(eff);
    }
  };
  const seen = new Set<NodeId>();
  const stacks: EffectSet[] = [];
  const visit = (id: NodeId): void => {
    if (seen.has(id)) return;
    seen.add(id);
    const n = getNode(id);
    if (!n) return;
    if (n.effects.length > 0) stacks.push(n.effects);
    if (n.dialect === "data" && n.op === "call" && callEffects.size > 0) {
      const callee = String((n.attrs as { callee?: string }).callee ?? "");
      if (
        callee === "call_user_func" ||
        callee === "call_user_func_array" ||
        callee === "forward_static_call" ||
        callee === "forward_static_call_array"
      ) {
        const firstArgNodeId = n.operands[0];
        const firstArg = firstArgNodeId ? getNode(firstArgNodeId) : undefined;
        const resolved = resolveCallableCandidates(firstArg);
        let fullyMatched = resolved.names.length > 0;
        for (const name of resolved.names) {
          if (!tryPushNamedCalleeEffects(name)) {
            fullyMatched = false;
          }
        }
        // Narrow when callable choices are explicit and all matched. Preserve the
        // widening fallback whenever resolution is partial/unknown to avoid missed effects.
        if (!(resolved.complete && fullyMatched)) {
          pushAllOverlayEffects();
        }
      } else if (callee) {
        tryPushNamedCalleeEffects(callee);
      }
    }
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
