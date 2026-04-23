/**
 * `unescaped-output` recognizer — reflected/stored XSS.
 *
 * Finds `effect.echo` sinks whose value derives from a tainted source
 * (request field, session read, or DB query result) without passing
 * through a recognized sanitizer. Also flags `data.html.template`
 * expression parts whose `escape === false` and whose expression is
 * tainted — PHP templates often use `<?= $raw ?>` which the ingest
 * lowers as a non-escaping template expression.
 *
 * Relies on the intra-handler taint primitive in `../taint.ts`. Because
 * that primitive is conservative (false positives preferred over false
 * negatives), this recognizer's default severity is `suggestion`; it's
 * promoted to `strong` only when the taint originates from a request
 * field (not a DB read, where the content may be trusted by policy).
 */
import type { Module, NodeBase, NodeId } from "@chrysalis/webir";
import type { Opportunity, Recognizer } from "../framework.js";
import { collectBindings, descendants, routes } from "../walk.js";
import { computeTaint } from "../taint.js";

const RECOGNIZER_ID = "unescaped-output" as const;

export const unescapedOutputRecognizer: Recognizer = {
  id: RECOGNIZER_ID,
  name: "Unescaped output (XSS)",
  description:
    "An `echo` statement writes data derived from an untrusted source (request field or session) without passing through `htmlspecialchars`, `json_encode`, or an equivalent sanitizer.",

  recognize(m: Module): ReadonlyArray<Opportunity> {
    const out: Opportunity[] = [];

    for (const route of routes(m)) {
      const bindings = collectBindings(m, route.bodyNode.id);
      const { taint, sources } = computeTaint(m, route.bodyNode.id, bindings);

      for (const n of descendants(m, route.bodyNode.id)) {
        if (n.dialect !== "effect" || n.op !== "echo") continue;
        const valueId = n.operands[0];
        if (!valueId) continue;

        const issues = diagnoseEcho(m, n, valueId, taint);
        for (const issue of issues) {
          const sourceKinds = describeSources(m, issue.taintedNodes, sources);
          const fromRequest = sourceKinds.includes("request");
          const severity = fromRequest ? "strong" : "suggestion";
          const confidence = fromRequest ? 0.75 : 0.55;
          const id = `${RECOGNIZER_ID}:${route.method}:${route.path}:${String(issue.anchor)}`;
          out.push({
            recognizer: RECOGNIZER_ID,
            id,
            title: issue.title,
            severity,
            confidence,
            nodes: Array.from(issue.taintedNodes),
            origin: m.nodes.get(issue.anchor)?.origin ?? n.origin,
            route: { method: route.method, path: route.path },
            rationale: issue.rationale,
            proposedLift: {
              kind: "sanitize-output",
              sketch: issue.isTemplate
                ? "Mark this interpolation as escape-by-default in the template (`{ kind: 'expr', escape: true }`); the emitter wraps tainted expressions in `html.escape` when `escape === true`."
                : "Wrap the echoed value in `html.escape(...)` (or serialize with `JSON.stringify` for script contexts). In generated Hono routes this becomes `c.html(html.escape(x))`.",
            },
            evidence: {
              sources: sourceKinds,
              isTemplate: issue.isTemplate,
              taintedCount: issue.taintedNodes.size,
            },
          });
        }
      }
    }

    return out;
  },
};

interface EchoIssue {
  readonly anchor: NodeId; // the node to anchor the opportunity on
  readonly taintedNodes: Set<NodeId>;
  readonly title: string;
  readonly rationale: string;
  readonly isTemplate: boolean;
}

function diagnoseEcho(
  m: Module,
  echoNode: NodeBase,
  valueId: NodeId,
  taint: ReadonlyMap<NodeId, "clean" | "tainted">,
): EchoIssue[] {
  const out: EchoIssue[] = [];
  const value = m.nodes.get(valueId);
  if (!value) return out;

  // Special case: template interpolation. Each `expr` part with
  // `escape === false` that resolves to a tainted expression is an XSS.
  if (value.dialect === "data" && value.op === "html.template") {
    const parts =
      ((value.attrs as { parts?: ReadonlyArray<unknown> }).parts as Array<
        { kind: "literal"; text: string } | { kind: "expr"; idx: number; escape: boolean }
      >) ?? [];
    let operandCursor = 0;
    for (const p of parts) {
      if (p.kind !== "expr") continue;
      const operandId = value.operands[operandCursor++];
      if (!operandId) continue;
      if (p.escape) continue;
      if (taint.get(operandId) !== "tainted") continue;
      out.push({
        anchor: operandId,
        taintedNodes: new Set([operandId, echoNode.id, value.id]),
        title: `Unescaped template interpolation in ${echoNode.id.slice(0, 6)}`,
        rationale:
          "Template expression is rendered without escaping and carries attacker-controllable content.",
        isTemplate: true,
      });
    }
    return out;
  }

  // General case: the echo value itself is tainted.
  if (taint.get(valueId) === "tainted") {
    out.push({
      anchor: echoNode.id,
      taintedNodes: new Set([echoNode.id, valueId]),
      title: "echo of unsanitized user-controlled value",
      rationale:
        "Value echoed to the response derives from an untrusted source (request field or session) without an intervening sanitizer.",
      isTemplate: false,
    });
  }

  return out;
}

/**
 * Infer which *kinds* of sources likely fed the flagged sink. We use the
 * handler-scoped `sources` set from the taint primitive: any source
 * that's marked tainted in the final map is a candidate, because the
 * taint primitive already performed binding resolution and operator
 * propagation for us. This over-attributes between sinks in handlers
 * that mix multiple inputs, which is acceptable for a diagnostic. A
 * future improvement is to track per-node source provenance during
 * propagation.
 */
function describeSources(
  m: Module,
  _tainted: ReadonlySet<NodeId>,
  sources: ReadonlySet<NodeId>,
): string[] {
  const kinds = new Set<string>();
  for (const sid of sources) {
    const s = m.nodes.get(sid);
    if (!s) continue;
    if (s.dialect === "data" && s.op === "request.field") kinds.add("request");
    else if (s.dialect === "effect" && s.op === "session.read") kinds.add("session");
    else if (s.dialect === "effect" && s.op === "db.query") kinds.add("db");
  }
  return [...kinds].sort();
}
