/**
 * Oracle footprint — static analysis of WebIR only (no PHP runtime, no extra deps).
 *
 * For each HTTP route, computes which **trace / injectable dimensions** must be
 * populated for deterministic replay: time, RNG, SQL tape tables, session, outbound
 * I/O, and holes. Exposes a single **hydration index** for CI trending.
 *
 * See DESIGN.md — Oracle footprint (static replay surface).
 */
import type { Effect, Module, NodeBase, NodeId } from "./index.js";
import { effectsReachableFrom } from "./builder.js";

export interface RouteOracleFootprint {
  readonly route: string;
  readonly holeCount: number;
  readonly nodesReachable: number;
  readonly wallClock: boolean;
  readonly entropy: boolean;
  readonly session: boolean;
  readonly dbReadTables: readonly string[];
  readonly dbWriteTables: readonly string[];
  readonly httpOutbound: boolean;
  readonly mail: boolean;
  /** Any `cache.read` / `cache.write` in the handler body subgraph. */
  readonly cache: boolean;
  /** Any `fs.read` / `fs.write` in the handler body subgraph. */
  readonly filesystem: boolean;
}

export interface OracleFootprint {
  readonly routes: readonly RouteOracleFootprint[];
  /** Distinct tables that appear in db.read across all routes (sorted). */
  readonly tapeTablesHint: readonly string[];
  /** Distinct tables that appear in db.write across all routes (sorted). */
  readonly writeTablesHint: readonly string[];
  /** Sum of per-route {@link RouteOracleFootprint.holeCount}. */
  readonly totalHoleCount: number;
  /** 0..100 rough score: higher ⇒ more oracle dimensions to hydrate. */
  readonly hydrationIndex: number;
}

function walkOperands(
  get: (id: NodeId) => NodeBase | undefined,
  root: NodeId,
  visit: (n: NodeBase) => void,
): void {
  const seen = new Set<NodeId>();
  const go = (id: NodeId): void => {
    if (seen.has(id)) return;
    seen.add(id);
    const n = get(id);
    if (!n) return;
    visit(n);
    for (const c of n.operands) go(c);
  };
  go(root);
}

function countHolesInSubtree(get: (id: NodeId) => NodeBase | undefined, root: NodeId): number {
  let n = 0;
  walkOperands(get, root, (node) => {
    if (node.dialect === "data" && node.op === "hole") n += 1;
  });
  return n;
}

function countNodesInSubtree(get: (id: NodeId) => NodeBase | undefined, root: NodeId): number {
  let n = 0;
  walkOperands(get, root, () => {
    n += 1;
  });
  return n;
}

function summarizeEffects(effects: ReadonlyArray<Effect>): {
  wallClock: boolean;
  entropy: boolean;
  session: boolean;
  dbReadTables: string[];
  dbWriteTables: string[];
  httpOutbound: boolean;
  mail: boolean;
  cache: boolean;
  filesystem: boolean;
} {
  const dbReadTables = new Set<string>();
  const dbWriteTables = new Set<string>();
  let wallClock = false;
  let entropy = false;
  let session = false;
  let httpOutbound = false;
  let mail = false;
  let cache = false;
  let filesystem = false;
  for (const e of effects) {
    if (e.kind === "time.now") wallClock = true;
    if (e.kind === "random") entropy = true;
    if (e.kind === "session.read" || e.kind === "session.write") session = true;
    if (e.kind === "db.read") dbReadTables.add(e.table);
    if (e.kind === "db.write") dbWriteTables.add(e.table);
    if (e.kind === "http.fetch") httpOutbound = true;
    if (e.kind === "mail.send") mail = true;
    if (e.kind === "cache.read" || e.kind === "cache.write") cache = true;
    if (e.kind === "fs.read" || e.kind === "fs.write") filesystem = true;
  }
  return {
    wallClock,
    entropy,
    session,
    dbReadTables: [...dbReadTables].sort(),
    dbWriteTables: [...dbWriteTables].sort(),
    httpOutbound,
    mail,
    cache,
    filesystem,
  };
}

function routeHydrationScore(r: RouteOracleFootprint): number {
  let s = 0;
  s += r.holeCount * 6;
  if (r.wallClock) s += 10;
  if (r.entropy) s += 10;
  if (r.session) s += 4;
  s += r.dbReadTables.length * 3;
  s += r.dbWriteTables.length * 4;
  if (r.httpOutbound) s += 12;
  if (r.mail) s += 12;
  if (r.cache) s += 6;
  if (r.filesystem) s += 12;
  return s;
}

/**
 * Compute the oracle footprint for every `web.request.route` in `module.roots`.
 * Routes that are not standard `route → handler → body` are skipped.
 */
export function computeOracleFootprint(m: Module): OracleFootprint {
  const get = (id: NodeId) => m.nodes.get(id);
  const routes: RouteOracleFootprint[] = [];
  const allReadTables = new Set<string>();
  const allWriteTables = new Set<string>();

  for (const rid of m.roots) {
    const routeNode = get(rid);
    if (!routeNode || routeNode.dialect !== "web.request" || routeNode.op !== "route") continue;
    const attrs = routeNode.attrs as { method?: string; path?: string };
    const method = attrs.method ?? "?";
    const path = attrs.path ?? "?";
    const handlerId = routeNode.operands[0];
    if (handlerId === undefined) continue;
    const handler = get(handlerId);
    if (!handler || handler.dialect !== "web.request" || handler.op !== "handler") continue;
    const bodyId = handler.operands[0];
    if (bodyId === undefined) continue;

    const eff = effectsReachableFrom(get, bodyId);
    const sum = summarizeEffects(eff);
    for (const t of sum.dbReadTables) allReadTables.add(t);
    for (const t of sum.dbWriteTables) allWriteTables.add(t);

    routes.push({
      route: `${method} ${path}`,
      holeCount: countHolesInSubtree(get, bodyId),
      nodesReachable: countNodesInSubtree(get, bodyId),
      wallClock: sum.wallClock,
      entropy: sum.entropy,
      session: sum.session,
      dbReadTables: sum.dbReadTables,
      dbWriteTables: sum.dbWriteTables,
      httpOutbound: sum.httpOutbound,
      mail: sum.mail,
      cache: sum.cache,
      filesystem: sum.filesystem,
    });
  }

  const tapeTablesHint = [...allReadTables].sort();
  const writeTablesHint = [...allWriteTables].sort();
  const totalHoleCount = routes.reduce((a, r) => a + r.holeCount, 0);
  const rawHydration = routes.reduce((a, r) => a + routeHydrationScore(r), 0);
  /** Normalize against ~60 points per route as a "heavy but normal" handler. */
  const denom = routes.length * 60;
  const hydrationIndex =
    routes.length === 0 ? 0 : Math.min(100, Math.round((100 * rawHydration) / denom));

  return { routes, tapeTablesHint, writeTablesHint, totalHoleCount, hydrationIndex };
}
