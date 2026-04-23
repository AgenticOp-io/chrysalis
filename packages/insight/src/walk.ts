/**
 * Walker utilities specialized for insight recognizers. These helpers give
 * each recognizer the context that makes opportunities actionable: the
 * route a node lives in, and fast subtree containment checks.
 *
 * The stock `webir.walk` is post-order and root-agnostic, which is great for
 * counting and typing, but recognizers need to scope their observations to a
 * single handler so they can attribute opportunities correctly.
 */
import type { Module, NodeBase, NodeId } from "@chrysalis/webir";

export interface RouteCtx {
  readonly method: string;
  readonly path: string;
  readonly routeNode: NodeBase;
  readonly handlerNode: NodeBase;
  readonly bodyNode: NodeBase;
}

/**
 * Yield each `web.request.route` root paired with its handler + body node.
 * Modules produced by `@chrysalis/ingest` place exactly one route per root
 * (see DESIGN.md § 5.1). Anything else is ignored by insight.
 */
export function* routes(m: Module): Generator<RouteCtx> {
  for (const rid of m.roots) {
    const route = m.nodes.get(rid);
    if (!route) continue;
    if (route.dialect !== "web.request" || route.op !== "route") continue;
    const handlerId = route.operands[0];
    const handler = handlerId ? m.nodes.get(handlerId) : undefined;
    if (!handler) continue;
    const bodyId = handler.operands[0];
    const body = bodyId ? m.nodes.get(bodyId) : undefined;
    if (!body) continue;
    const attrs = route.attrs as { method?: string; path?: string };
    yield {
      method: attrs.method ?? "GET",
      path: attrs.path ?? "/",
      routeNode: route,
      handlerNode: handler,
      bodyNode: body,
    };
  }
}

/**
 * Collect all distinct descendant nodes of `root` (inclusive). Safe across
 * shared operands — visits each node at most once per call.
 */
export function descendants(m: Module, root: NodeId): NodeBase[] {
  const out: NodeBase[] = [];
  const seen = new Set<NodeId>();
  const stack: NodeId[] = [root];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const n = m.nodes.get(id);
    if (!n) continue;
    out.push(n);
    for (const op of n.operands) stack.push(op);
    // Non-operand attrs that point at sibling nodes (currently only
    // `db.query.sqlExpr`) are treated as virtual operands here so
    // recognizers scoped to `descendants(body)` reach every node in
    // the handler's logical subtree.
    const extra = virtualOperandsOf(n);
    for (const v of extra) stack.push(v);
  }
  return out;
}

/**
 * Non-operand attrs that reference sibling nodes. Kept centralized so
 * any walker can pick up new cross-references without having to know
 * which dialects they live in.
 */
function virtualOperandsOf(n: NodeBase): ReadonlyArray<NodeId> {
  if (n.dialect === "effect" && n.op === "db.query") {
    const sqlExpr = (n.attrs as { sqlExpr?: NodeId }).sqlExpr;
    if (sqlExpr) return [sqlExpr];
  }
  return [];
}

/**
 * Visit descendants of `root` with early termination: the visitor may return
 * `false` to prune children of the current node. Useful when we want to find
 * the *outermost* instance of a pattern (e.g. outermost foreach for N+1).
 */
export function visitDescendants(
  m: Module,
  root: NodeId,
  visit: (n: NodeBase) => boolean | void,
): void {
  const seen = new Set<NodeId>();
  const go = (id: NodeId): void => {
    if (seen.has(id)) return;
    seen.add(id);
    const n = m.nodes.get(id);
    if (!n) return;
    const cont = visit(n);
    if (cont === false) return;
    for (const op of n.operands) go(op);
    for (const v of virtualOperandsOf(n)) go(v);
  };
  go(root);
}

/** True iff any descendant of `root` satisfies the predicate. */
export function anyDescendant(
  m: Module,
  root: NodeId,
  pred: (n: NodeBase) => boolean,
): boolean {
  let found = false;
  visitDescendants(m, root, (n) => {
    if (found) return false;
    if (pred(n)) {
      found = true;
      return false;
    }
    return true;
  });
  return found;
}

/** Collect descendants that satisfy the predicate. */
export function findDescendants(
  m: Module,
  root: NodeId,
  pred: (n: NodeBase) => boolean,
): NodeBase[] {
  const out: NodeBase[] = [];
  visitDescendants(m, root, (n) => {
    if (pred(n)) out.push(n);
  });
  return out;
}

/**
 * Build a "last writer wins" map of local-variable bindings for a handler.
 *
 * Ingest lowers `$x = <rhs>` to `data.call(__assign, [literal "x", <rhs>])`,
 * so this scan just walks the handler body looking for that pattern and
 * records the rhs node for each name. It's a conservative lexical map,
 * not SSA: a later assignment overwrites an earlier one, and we don't
 * track per-branch bindings. That's enough for recognizers that only need
 * to find *some* producer for a given name.
 */
export function collectBindings(m: Module, root: NodeId): Map<string, NodeId> {
  const out = new Map<string, NodeId>();
  visitDescendants(m, root, (n) => {
    if (n.dialect !== "data" || n.op !== "call") return true;
    if ((n.attrs as { callee?: string }).callee !== "__assign") return true;
    const nameNodeId = n.operands[0];
    const rhsId = n.operands[1];
    if (!nameNodeId || !rhsId) return true;
    const nameNode = m.nodes.get(nameNodeId);
    if (!nameNode || nameNode.op !== "literal") return true;
    const name = (nameNode.attrs as { value?: unknown }).value;
    if (typeof name !== "string") return true;
    out.set(name, rhsId);
    return true;
  });
  return out;
}

/**
 * Resolve a chain of `param(name)` references through `collectBindings`. If
 * `start` is a `data.param`, look up its binding and recurse; otherwise
 * return `start` unchanged. Bounded to `maxHops` to avoid cycles.
 */
export function resolveBinding(
  m: Module,
  bindings: Map<string, NodeId>,
  start: NodeId,
  maxHops = 4,
): NodeBase | undefined {
  let cur = m.nodes.get(start);
  for (let i = 0; cur && i < maxHops; i++) {
    if (cur.dialect !== "data" || cur.op !== "param") return cur;
    const name = (cur.attrs as { name?: string }).name;
    if (!name) return cur;
    const next = bindings.get(name);
    if (!next) return cur;
    cur = m.nodes.get(next);
  }
  return cur;
}
