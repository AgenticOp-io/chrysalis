/**
 * Recognizer framework — the heart of `@chrysalis/insight`.
 *
 * A recognizer walks a WebIR `Module` and returns a list of `Opportunity`
 * records. Each opportunity is a typed, machine-readable pointer to a
 * subgraph that exhibits a legacy anti-pattern, paired with a sketch of the
 * idiomatic modern replacement.
 *
 * Two design rules:
 *
 *   1. Recognizers are pure over the IR. They must not touch the filesystem,
 *      network, or mutable state. The runner is responsible for composing
 *      them and for attaching extrinsic evidence (corpus confirmation,
 *      user overrides, prior acceptance).
 *
 *   2. Every opportunity carries provenance that survives re-ingestion. The
 *      `Locator` array pins the opportunity to concrete source positions so
 *      status/rewrite stages can resurface it across rebuilds.
 */
import type { Locator, Module, NodeId } from "@chrysalis/webir";
import type { TraceCorpus } from "@chrysalis/oracle";

/**
 * The canonical set of recognizer kinds. New recognizers must extend this
 * union so consumers (status dashboard, rewriter) can dispatch on it.
 */
export type RecognizerId =
  | "n-plus-one-queries"
  | "scattered-validation"
  | "string-dispatch"
  | "unescaped-output"
  | "raw-sql-concat";

export type Severity = "info" | "suggestion" | "strong";

export interface ProposedLift {
  /** Short machine kind, e.g. "batch-loader", "zod-schema", "action-union". */
  readonly kind: string;
  /** One- or two-sentence sketch of the rewrite. */
  readonly sketch: string;
  /** Suggested dependencies to add (e.g. ["zod"]). */
  readonly requires?: ReadonlyArray<string>;
}

export interface Opportunity {
  readonly recognizer: RecognizerId;
  /** Stable id within a report: `<recognizer>:<route>:<site>`. */
  readonly id: string;
  readonly title: string;
  readonly severity: Severity;
  /**
   * Confidence in [0, 1]. Pure IR recognizers should report no more than
   * 0.8; the runner boosts toward 1.0 when the corpus corroborates the
   * finding (e.g. the inner query actually fires N times per request).
   */
  readonly confidence: number;
  /** Every node involved in the subgraph, useful for the rewriter. */
  readonly nodes: ReadonlyArray<NodeId>;
  /** Canonical source location for display. */
  readonly origin: Locator;
  /** Route (method + path) the opportunity lives in, if known. */
  readonly route?: { method: string; path: string };
  readonly rationale: string;
  readonly proposedLift: ProposedLift;
  /** Recognizer-specific shape; consumed by the rewriter and tests. */
  readonly evidence: Readonly<Record<string, unknown>>;
}

export interface Recognizer {
  readonly id: RecognizerId;
  readonly name: string;
  readonly description: string;
  recognize(module: Module): ReadonlyArray<Opportunity>;
}

export interface InsightReport {
  readonly generatedAt: string;
  readonly sourceApp: string;
  readonly recognizers: ReadonlyArray<RecognizerId>;
  readonly opportunities: ReadonlyArray<Opportunity>;
  readonly summary: {
    readonly total: number;
    readonly byRecognizer: Record<RecognizerId, number>;
    readonly bySeverity: Record<Severity, number>;
  };
}

export interface RunInsightOptions {
  /** Restrict to these recognizers; empty/omitted means "run all". */
  readonly only?: ReadonlyArray<RecognizerId>;
  /** Optional corpus used to boost confidence and attach observed evidence. */
  readonly corpus?: TraceCorpus;
}

export interface RunInsightInput extends RunInsightOptions {
  readonly module: Module;
  readonly recognizers: ReadonlyArray<Recognizer>;
}

/**
 * Execute the requested recognizers over a module and build an
 * `InsightReport`. Corpus evidence (if provided) is attached via a
 * post-processing pass so recognizers stay pure over the IR.
 */
export function runInsight(input: RunInsightInput): InsightReport {
  const selected = input.only && input.only.length > 0
    ? input.recognizers.filter((r) => input.only!.includes(r.id))
    : input.recognizers;

  const raw: Opportunity[] = [];
  for (const r of selected) {
    for (const op of r.recognize(input.module)) raw.push(op);
  }

  const opportunities = input.corpus
    ? raw.map((op) => boostWithCorpus(op, input.corpus!))
    : raw;

  const summary = summarize(opportunities, selected.map((r) => r.id));

  return {
    generatedAt: new Date().toISOString(),
    sourceApp: input.module.meta.sourceApp,
    recognizers: selected.map((r) => r.id),
    opportunities,
    summary,
  };
}

function summarize(
  ops: ReadonlyArray<Opportunity>,
  ids: ReadonlyArray<RecognizerId>,
): InsightReport["summary"] {
  const byRecognizer = Object.fromEntries(ids.map((id) => [id, 0])) as Record<
    RecognizerId,
    number
  >;
  const bySeverity: Record<Severity, number> = { info: 0, suggestion: 0, strong: 0 };
  for (const op of ops) {
    byRecognizer[op.recognizer] = (byRecognizer[op.recognizer] ?? 0) + 1;
    bySeverity[op.severity] += 1;
  }
  return { total: ops.length, byRecognizer, bySeverity };
}

/**
 * Corpus-based confidence boost. The recognizers themselves never see the
 * corpus — this function looks at the opportunity's evidence fields and
 * cross-references trace events. The heuristics are intentionally simple
 * and recognizer-specific; see the individual files for details.
 */
export function boostWithCorpus(op: Opportunity, corpus: TraceCorpus): Opportunity {
  switch (op.recognizer) {
    case "n-plus-one-queries":
      return boostNPlusOne(op, corpus);
    case "unescaped-output":
      return boostUnescapedOutput(op, corpus);
    case "raw-sql-concat":
      return boostRawSqlConcat(op, corpus);
    case "scattered-validation":
    case "string-dispatch":
      return op;
  }
}

/**
 * Corpus boost for XSS: if a captured response body literally contains
 * the request-field value observed in the same trace, that's a smoking
 * gun — the tainted string survived the echo unsanitized in real traffic.
 */
function boostUnescapedOutput(op: Opportunity, corpus: TraceCorpus): Opportunity {
  const route = op.route;
  let matchingTraces = 0;
  let exampleValue: string | null = null;
  for (const trace of corpus.traces) {
    const reqEv = trace.events.find((e) => e.type === "http.request") as
      | { path: string; post: Record<string, unknown>; query: Record<string, string> }
      | undefined;
    if (!reqEv) continue;
    if (route && !routeMatches(reqEv.path, route.path)) continue;
    const respEv = trace.events.find((e) => e.type === "http.response") as
      | { body: string }
      | undefined;
    if (!respEv || typeof respEv.body !== "string") continue;
    const candidates: string[] = [];
    for (const v of Object.values(reqEv.post)) {
      if (typeof v === "string" && v.length >= 3) candidates.push(v);
    }
    for (const v of Object.values(reqEv.query)) {
      if (typeof v === "string" && v.length >= 3) candidates.push(v);
    }
    for (const c of candidates) {
      if (respEv.body.includes(c)) {
        matchingTraces += 1;
        if (exampleValue === null) exampleValue = c;
        break;
      }
    }
  }
  if (matchingTraces === 0) return op;
  return {
    ...op,
    confidence: Math.min(1, op.confidence + 0.2),
    severity: "strong",
    evidence: {
      ...op.evidence,
      corpusConfirmations: matchingTraces,
      exampleValueEchoed: exampleValue,
    },
  };
}

/**
 * Corpus boost for dynamic SQL: traces on the same route that executed at least
 * one `sql.query` confirm the handler really hits the database — evidence for
 * `parameterize-sql` corpus gating (DESIGN D200).
 */
function boostRawSqlConcat(op: Opportunity, corpus: TraceCorpus): Opportunity {
  const route = op.route;
  let confirmingTraces = 0;
  let maxPerRequest = 0;
  for (const trace of corpus.traces) {
    const reqEv = trace.events.find((e) => e.type === "http.request") as
      | { path: string }
      | undefined;
    if (!reqEv) continue;
    if (route && !routeMatches(reqEv.path, route.path)) continue;
    let sqlCount = 0;
    for (const ev of trace.events) {
      if (ev.type === "sql.query") sqlCount += 1;
    }
    if (sqlCount > maxPerRequest) maxPerRequest = sqlCount;
    if (sqlCount >= 1) confirmingTraces += 1;
  }
  if (confirmingTraces === 0) return op;
  const evidence = {
    ...op.evidence,
    corpusConfirmations: confirmingTraces,
    observedMaxPerRequest: maxPerRequest,
  };
  return {
    ...op,
    confidence: Math.min(1, op.confidence + 0.1),
    evidence,
  };
}

function boostNPlusOne(op: Opportunity, corpus: TraceCorpus): Opportunity {
  const innerSql = op.evidence["innerSqlCanonical"];
  if (typeof innerSql !== "string") return op;
  const route = op.route;
  let maxPerRequest = 0;
  let totalFirings = 0;
  let confirmingTraces = 0;
  for (const trace of corpus.traces) {
    const reqEv = trace.events.find((e) => e.type === "http.request");
    if (route && reqEv && !routeMatches((reqEv as { path: string }).path, route.path)) continue;
    let count = 0;
    for (const ev of trace.events) {
      if (ev.type !== "sql.query") continue;
      if (canonicalSql((ev as { sql: string }).sql) === innerSql) count += 1;
    }
    if (count >= 2) {
      confirmingTraces += 1;
      totalFirings += count;
      if (count > maxPerRequest) maxPerRequest = count;
    }
  }
  if (confirmingTraces === 0) return op;
  const evidence = {
    ...op.evidence,
    corpusConfirmations: confirmingTraces,
    observedMaxPerRequest: maxPerRequest,
    observedTotalFirings: totalFirings,
  };
  return {
    ...op,
    confidence: Math.min(1, op.confidence + 0.15),
    severity: "strong",
    evidence,
  };
}

/** Canonicalize SQL for shallow equality — collapses whitespace and casing. */
export function canonicalSql(sql: string): string {
  return sql.replace(/\s+/g, " ").trim().toLowerCase();
}

/** Match trace path against a route pattern like `/posts/:id`. */
function routeMatches(actual: string, pattern: string): boolean {
  const a = actual.split("?")[0]!.split("/").filter(Boolean);
  const p = pattern.split("/").filter(Boolean);
  if (a.length !== p.length) return false;
  for (let i = 0; i < p.length; i++) {
    const seg = p[i]!;
    if (seg.startsWith(":")) continue;
    if (seg !== a[i]) return false;
  }
  return true;
}
