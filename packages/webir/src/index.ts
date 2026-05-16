/**
 * @chrysalis/webir — multi-dialect IR for web applications.
 *
 * This module is the portable contract between frontends (ingest) and backends
 * (emit-*). See `README.md` and `../../DESIGN.md` § 5.1 for the full model.
 */

export type NodeId = string & { readonly __brand: "NodeId" };

/**
 * A pointer back to the originating artifact that produced a WebIR node.
 * Legacy PHP source is the most common origin, but DB introspection, HTML
 * form scans, and observed traces are all valid origins.
 */
export type Locator =
  | { kind: "php"; file: string; line: number; col: number }
  | { kind: "db"; table: string; column?: string }
  | { kind: "form"; file: string; fieldName: string }
  | { kind: "trace"; corpusId: string; frameId: string }
  | { kind: "synthetic"; reason: string };

/**
 * A provenance entry records *why* a node or type exists. Multiple entries
 * may stack (e.g. "from DB schema AND confirmed by 1,247 observed traces").
 */
export interface Provenance {
  source:
    | "php-ast"
    | "db-schema"
    | "form-scan"
    | "trace-corpus"
    | "repair-pass"
    | "intent-rewrite"
    | "hand-authored";
  locator: Locator;
  reason: string;
}

/**
 * The effect system. Every node carries a set; every handler's signature
 * surfaces the union of its body's effects. See DESIGN.md § 6.1.
 */
export type Effect =
  | { kind: "db.read"; table: string }
  | { kind: "db.write"; table: string }
  | { kind: "session.read" }
  | { kind: "session.write" }
  | { kind: "mail.send" }
  | { kind: "http.fetch"; host?: string }
  | { kind: "cache.read" }
  | { kind: "cache.write" }
  | { kind: "time.now" }
  | { kind: "random" }
  | { kind: "fs.read" }
  | { kind: "fs.write" };

export type EffectSet = ReadonlyArray<Effect>;

/**
 * The WebIR type lattice. Intentionally small; grows only with design review.
 * `Unknown` means inference failed and the node is a candidate for a hole.
 */
export type WebIRType =
  | { kind: "unknown" }
  | { kind: "void" }
  | { kind: "null" }
  | { kind: "bool" }
  | { kind: "int" }
  | { kind: "float" }
  | { kind: "string" }
  | { kind: "literal"; value: string | number | boolean }
  | { kind: "array"; element: WebIRType }
  | { kind: "record"; fields: Record<string, WebIRType> }
  | { kind: "union"; members: ReadonlyArray<WebIRType> }
  | { kind: "nullable"; inner: WebIRType }
  | { kind: "named"; name: string }
  | { kind: "hole"; contract: { input: WebIRType; output: WebIRType } };

/**
 * Every WebIR node is shaped like this. Concrete dialects narrow `op` and
 * `operands`. See `dialects/*` for the op registries.
 */
export interface NodeBase {
  readonly id: NodeId;
  readonly dialect: string;
  readonly op: string;
  readonly type: WebIRType;
  readonly effects: EffectSet;
  readonly operands: ReadonlyArray<NodeId>;
  readonly attrs: Readonly<Record<string, unknown>>;
  readonly origin: Locator;
  readonly provenance: ReadonlyArray<Provenance>;
}

/**
 * A `Module` is a compilation unit: a set of nodes plus the roots that anchor
 * traversal (typically one per request handler).
 */
export interface Module {
  readonly nodes: ReadonlyMap<NodeId, NodeBase>;
  readonly roots: ReadonlyArray<NodeId>;
  readonly meta: {
    readonly sourceApp: string;
    readonly createdAt: string;
    readonly chrysalisVersion: string;
  };
}

/** Utility: create a branded NodeId. */
export const nodeId = (s: string): NodeId => s as NodeId;

export {
  ModuleBuilder,
  moduleBuilderResumeFromModule,
  NO_EFFECTS,
  T,
  mergeEffects,
  effectsReachableFrom,
  effectsReachableWithCallOverlay,
  effectTag,
  effectTagsSorted,
  phpLocator,
  provenance,
  synthetic,
} from "./builder.js";
export { IdGen } from "./ids.js";
export {
  allNodes,
  countAuthTaggedHoles,
  countByDialect,
  countHoles,
  irCoverageStats,
  walk,
} from "./visit.js";
export { isAuthBoundaryCallee, authTaggedHoleReason } from "./auth-boundary.js";
export { computeOracleFootprint, type OracleFootprint, type RouteOracleFootprint } from "./oracle-footprint.js";
export { moduleToGoldenSnapshot, type GoldenSnapshotOptions } from "./snapshot.js";
export { moduleFromGoldenSnapshot } from "./from-snapshot.js";
export {
  deserializeModuleCheckpoint,
  MODULE_CHECKPOINT_KIND,
  MODULE_CHECKPOINT_SCHEMA_VERSION,
  serializeModuleCheckpoint,
  type ModuleCheckpointV1,
} from "./module-checkpoint.js";
export { mergeWebIrModules } from "./merge-modules.js";
export { mergeDedupeStructuralKey, mergeDedupeStructuralKeyIgnoringOrigin } from "./merge-dedupe-key.js";
export { dedupeStructuralSubgraphsInModule } from "./dedupe-module-structural.js";
export type { ModuleBuilderOpts } from "./builder.js";
export * as webRequest from "./dialects/web-request.js";
export * as effectDialect from "./dialects/effect.js";
export * as dataDialect from "./dialects/data.js";
