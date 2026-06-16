/**
 * Milestone 3 (v1): map HTTP replay divergences to a small set of WebIR nodes
 * in the matching route handler. Heuristic only — precise blame needs emit
 * source maps and richer contracts later.
 */

import type { Module, NodeBase, NodeId } from "@chrysalis/webir";
import type { Divergence, DivergenceKind } from "./diff.js";

export const MAX_ATTRIBUTION_NODES = 5;

function parseRouteLabel(routeLabel: string): { method: string; path: string } {
  const i = routeLabel.indexOf(" ");
  if (i === -1) {
    return { method: routeLabel.toUpperCase(), path: "" };
  }
  return {
    method: routeLabel.slice(0, i).toUpperCase(),
    path: routeLabel.slice(i + 1),
  };
}

/** Handler body root for `METHOD path` (same label as {@link TraceOutcome.route}). */
export function findHandlerBodyRoot(m: Module, routeLabel: string): NodeId | null {
  const want = parseRouteLabel(routeLabel);
  for (const rid of m.roots) {
    const r = m.nodes.get(rid);
    if (!r || r.dialect !== "web.request" || r.op !== "route") continue;
    const attrs = r.attrs as { method?: string; path?: string };
    if (String(attrs.method ?? "").toUpperCase() !== want.method) continue;
    if (String(attrs.path ?? "") !== want.path) continue;
    const handlerId = r.operands[0];
    if (!handlerId) return null;
    const h = m.nodes.get(handlerId);
    if (!h || h.operands.length === 0) return null;
    return h.operands[0] ?? null;
  }
  return null;
}

function collectSubtreeNodes(m: Module, root: NodeId): NodeBase[] {
  const out: NodeBase[] = [];
  const seen = new Set<NodeId>();
  const go = (id: NodeId): void => {
    if (seen.has(id)) return;
    seen.add(id);
    const n = m.nodes.get(id);
    if (!n) return;
    out.push(n);
    for (const c of n.operands) go(c);
  };
  go(root);
  return out;
}

function nodeMatchesDivergenceKind(n: NodeBase, kind: DivergenceKind): boolean {
  if (kind === "body-mismatch") {
    if (n.dialect === "effect") {
      return (
        n.op === "echo" ||
        n.op === "db.query" ||
        n.op === "session.write" ||
        n.op === "redirect"
      );
    }
    if (n.dialect === "data") {
      if (n.op === "html.template" || n.op === "concat") return true;
      if (n.op === "call") {
        const c = String((n.attrs as { callee?: string }).callee ?? "");
        return (
          c !== "" &&
          c !== "__ternary" &&
          c !== "__arrow_fn" &&
          c !== "__match" &&
          !c.startsWith("__cast_") &&
          !c.startsWith("__array") &&
          !c.startsWith("__return") &&
          !c.startsWith("__throw")
        );
      }
    }
    return false;
  }
  if (kind === "status-mismatch") {
    if (n.dialect === "effect") {
      return n.op === "redirect" || n.op === "http.error";
    }
    if (n.dialect === "data" && n.op === "call") {
      const c = String((n.attrs as { callee?: string }).callee ?? "");
      return c === "__exit" || c === "__return" || c === "__throw";
    }
    return false;
  }
  // header-mismatch (e.g. Location) — same control/redirect surface as status.
  if (n.dialect === "effect") {
    return n.op === "redirect" || n.op === "http.error";
  }
  return false;
}

/**
 * Returns up to {@link MAX_ATTRIBUTION_NODES} node ids in the handler subtree
 * that best match the divergence kinds (primary matches first, then any
 * `effect` nodes, then fill order).
 */
export function attributeDivergenceToNodes(
  m: Module,
  routeLabel: string,
  divergences: ReadonlyArray<Divergence>,
): readonly NodeId[] {
  const bodyRoot = findHandlerBodyRoot(m, routeLabel);
  if (!bodyRoot || divergences.length === 0) return [];

  const nodes = collectSubtreeNodes(m, bodyRoot);
  const kinds = [...new Set(divergences.map((d) => d.kind))];
  const out: NodeId[] = [];
  const seen = new Set<NodeId>();

  for (const kind of kinds) {
    for (const n of nodes) {
      if (!nodeMatchesDivergenceKind(n, kind) || seen.has(n.id)) continue;
      seen.add(n.id);
      out.push(n.id);
      if (out.length >= MAX_ATTRIBUTION_NODES) return out;
    }
  }

  for (const n of nodes) {
    if (n.dialect !== "effect" || seen.has(n.id)) continue;
    seen.add(n.id);
    out.push(n.id);
    if (out.length >= MAX_ATTRIBUTION_NODES) return out;
  }

  for (const n of nodes) {
    if (seen.has(n.id)) continue;
    seen.add(n.id);
    out.push(n.id);
    if (out.length >= MAX_ATTRIBUTION_NODES) return out;
  }

  return out;
}
