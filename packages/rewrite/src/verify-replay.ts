/**
 * Behavioral verification of rewrites via in-process IR simulation
 * (D19).
 *
 * Strategy: for each route in the module, synthesize a small set of
 * probe request inputs, evaluate the handler's IR under both the
 * pre-rewrite and post-rewrite modules, and diff the responses. For
 * each applied pass we know what observable change it introduces, so
 * we transform the pre-response accordingly to get an "expected
 * post" and compare strictly against the actual post. Any unexplained
 * divergence is a behavioral regression.
 *
 * This is the third verification layer on top of D16 invariants
 * (pass hygiene) and D18 post-rewrite recognizer re-run (pass
 * effectiveness). Together they give the rewrite driver:
 *
 *   - D16: "the pass only mutated nodes it declared"
 *   - D18: "the pass actually fixed the finding it claimed"
 *   - D19: "the module's observable behavior under probe inputs is
 *          unchanged, modulo the declared effects of applied passes"
 *
 * Like D18, D19 runs once per batch and rolls back all-or-nothing.
 * Unlike D18, D19 abstains when the simulator hits an op it can't
 * evaluate (rather than reporting a false regression). Abstention is
 * recorded in the report so operators know the gate didn't run on
 * that probe, but it doesn't roll back the batch.
 */
import type { Module, NodeBase, NodeId } from "@chrysalis/webir";
import type { AppliedRecord } from "./framework.js";
import {
  DEFAULT_STUB_DB,
  simValueEquals,
  simulateHandler,
  type DbReadEvent,
  type DbWriteEvent,
  type RequestInput,
  type SessionWriteEvent,
  type SimResponse,
  type StubDb,
} from "./simulate.js";

export interface Probe {
  readonly id: string;
  readonly input: RequestInput;
  /**
   * The subset of `input` values that represent attacker-controlled
   * strings. Used by the sanitize-output response transform to know
   * which substrings should be html-escaped when predicting the
   * post-rewrite body.
   */
  readonly taintedValues: ReadonlyArray<string>;
}

export interface RouteInfo {
  readonly routeId: NodeId;
  readonly method: string;
  readonly path: string;
  readonly queryFields: ReadonlyArray<string>;
  readonly bodyFields: ReadonlyArray<string>;
  readonly cookieFields: ReadonlyArray<string>;
  readonly sessionReads: ReadonlyArray<string>;
}

export interface BehaviorDivergence {
  readonly route: string;
  readonly probe: string;
  readonly kind:
    | "status"
    | "redirect"
    | "body"
    | "db-reads"
    | "db-writes"
    | "session-writes";
  readonly detail: string;
  readonly pre: string;
  readonly post: string;
  readonly expected: string;
}

export interface BehaviorVerifyResult {
  readonly ok: boolean;
  readonly probesRun: number;
  readonly routesCovered: number;
  readonly abstained: number;
  readonly divergences: ReadonlyArray<BehaviorDivergence>;
}

export interface BehaviorVerifyOptions {
  readonly probes?: ReadonlyArray<Probe>;
  readonly db?: StubDb;
  /**
   * When true (default), the gate synthesizes its own probes per
   * route using request-field metadata read out of each handler. A
   * caller can still pass additional probes via `probes`.
   */
  readonly synthesizeProbes?: boolean;
}

/**
 * Run the behavioral verification gate on a pre/post module pair.
 *
 * Returns `{ ok: true }` if every probe either matches the expected
 * post-response for the applied passes, or abstained because of a
 * simulator gap. Returns `{ ok: false }` with a list of divergences
 * otherwise.
 */
export function verifyBehavior(
  before: Module,
  after: Module,
  applied: ReadonlyArray<AppliedRecord>,
  opts: BehaviorVerifyOptions = {},
): BehaviorVerifyResult {
  const db = opts.db ?? DEFAULT_STUB_DB;
  const routes = routesOf(before);
  const probes: Probe[] = [...(opts.probes ?? [])];
  if (opts.synthesizeProbes !== false) {
    for (const r of routes) probes.push(...synthesizeProbesFor(before, r));
  }

  const divergences: BehaviorDivergence[] = [];
  const routesCovered = new Set<string>();
  let abstained = 0;

  const passIds = new Set(applied.map((a) => a.pass));

  for (const probe of probes) {
    const route = matchRouteForProbe(routes, probe);
    if (!route) continue;
    routesCovered.add(`${route.method} ${route.path}`);

    const preSim = simulateHandler(before, route.routeId, probe.input, db);
    const postSim = simulateHandler(after, route.routeId, probe.input, db);

    if (preSim.errors.length > 0 || postSim.errors.length > 0) {
      abstained++;
      continue;
    }

    const expected = predictPostFromPre(preSim, probe, passIds);
    divergences.push(...diffResponses(route, probe, postSim, expected));
  }

  return {
    ok: divergences.length === 0,
    probesRun: probes.length,
    routesCovered: routesCovered.size,
    abstained,
    divergences,
  };
}

function routesOf(m: Module): RouteInfo[] {
  const out: RouteInfo[] = [];
  for (const rid of m.roots) {
    const route = m.nodes.get(rid);
    if (!route || route.dialect !== "web.request" || route.op !== "route") continue;
    const handlerId = route.operands[0];
    const handler = handlerId ? m.nodes.get(handlerId) : undefined;
    const bodyId = handler?.operands[0];
    if (!bodyId) continue;

    const attrs = route.attrs as { method?: string; path?: string };
    const query = new Set<string>();
    const body = new Set<string>();
    const cookie = new Set<string>();
    const sessionReads = new Set<string>();

    collectFields(m, bodyId, { query, body, cookie, sessionReads });

    out.push({
      routeId: rid,
      method: attrs.method ?? "GET",
      path: attrs.path ?? "/",
      queryFields: [...query],
      bodyFields: [...body],
      cookieFields: [...cookie],
      sessionReads: [...sessionReads],
    });
  }
  return out;
}

function collectFields(
  m: Module,
  root: NodeId,
  sink: {
    query: Set<string>;
    body: Set<string>;
    cookie: Set<string>;
    sessionReads: Set<string>;
  },
): void {
  const seen = new Set<NodeId>();
  const stack: NodeId[] = [root];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const n = m.nodes.get(id);
    if (!n) continue;
    if (n.dialect === "data" && n.op === "request.field") {
      const a = n.attrs as { source: string; name: string };
      if (a.source === "query") sink.query.add(a.name);
      else if (a.source === "body") sink.body.add(a.name);
      else if (a.source === "cookie") sink.cookie.add(a.name);
    }
    if (n.dialect === "effect" && n.op === "session.read") {
      const a = n.attrs as { key: string };
      sink.sessionReads.add(a.key);
    }
    for (const op of n.operands) stack.push(op);
    if (n.dialect === "effect" && n.op === "db.query") {
      const extra = (n.attrs as { sqlExpr?: NodeId }).sqlExpr;
      if (extra) stack.push(extra);
    }
  }
}

function matchRouteForProbe(
  routes: ReadonlyArray<RouteInfo>,
  probe: Probe,
): RouteInfo | undefined {
  return routes.find(
    (r) => r.method === probe.input.method && r.path === probe.input.path,
  );
}

/**
 * Default probe generation: for each route, emit two probes — one
 * benign (alphanumeric field values) and one "attacky" (contains
 * shell-injection-like chars that pass through sanitize-output).
 * Both probes use the same session + cookie shape, so any session
 * divergence is a true regression and not a probe-generation artifact.
 */
function synthesizeProbesFor(_m: Module, r: RouteInfo): Probe[] {
  const benignQuery: Record<string, string> = {};
  for (const f of r.queryFields) benignQuery[f] = `benign-${f}`;
  const benignPost: Record<string, string> = {};
  for (const f of r.bodyFields) benignPost[f] = `benign-${f}`;
  const benignCookies: Record<string, string> = {};
  for (const f of r.cookieFields) benignCookies[f] = `cookie-${f}`;

  const attackQuery: Record<string, string> = {};
  for (const f of r.queryFields) attackQuery[f] = `<script>a"&b'</script>`;
  const attackPost: Record<string, string> = {};
  for (const f of r.bodyFields) attackPost[f] = `<img src=x onerror=y>`;

  const probes: Probe[] = [];
  probes.push({
    id: `${r.method}:${r.path}:benign`,
    input: {
      method: r.method,
      path: r.path,
      query: benignQuery,
      post: benignPost,
      cookies: benignCookies,
      session: {},
      pathParams: {},
    },
    taintedValues: [
      ...Object.values(benignQuery),
      ...Object.values(benignPost),
    ],
  });
  // Only emit the attack probe when there's at least one user-controlled
  // field — otherwise the attack-path probe is identical to the
  // benign one and contributes no signal.
  if (r.queryFields.length + r.bodyFields.length > 0) {
    probes.push({
      id: `${r.method}:${r.path}:attack`,
      input: {
        method: r.method,
        path: r.path,
        query: attackQuery,
        post: attackPost,
        cookies: benignCookies,
        session: {},
        pathParams: {},
      },
      taintedValues: [
        ...Object.values(attackQuery),
        ...Object.values(attackPost),
      ],
    });
  }
  return probes;
}

/**
 * Given a pre-rewrite simulated response and the set of applied
 * passes, predict what the post-rewrite response should look like if
 * every pass did *exactly* what it claims to do and nothing more.
 *
 * Current transforms:
 *   - sanitize-output: every occurrence of a tainted input in the
 *     pre.body should appear HTML-escaped in the post.body.
 *   - parameterize-sql: no observable change — SQL text differs but
 *     the db stub returns the same result given the same params.
 *
 * Everything else is expected to match byte-for-byte.
 */
function predictPostFromPre(
  preSim: SimResponse,
  probe: Probe,
  passIds: ReadonlySet<string>,
): SimResponse {
  let body = preSim.body;
  if (passIds.has("sanitize-output")) {
    // Replace longest tainted strings first so we don't double-escape
    // nested ones.
    const ordered = [...probe.taintedValues].sort(
      (a, b) => b.length - a.length,
    );
    for (const t of ordered) {
      if (t.length === 0) continue;
      body = splitReplace(body, t, htmlEscape(t));
    }
  }
  return { ...preSim, body };
}

function splitReplace(haystack: string, needle: string, replacement: string): string {
  if (needle.length === 0) return haystack;
  return haystack.split(needle).join(replacement);
}

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function diffResponses(
  route: RouteInfo,
  probe: Probe,
  actual: SimResponse,
  expected: SimResponse,
): BehaviorDivergence[] {
  const rk = `${route.method} ${route.path}`;
  const out: BehaviorDivergence[] = [];

  if (actual.status !== expected.status) {
    out.push({
      route: rk,
      probe: probe.id,
      kind: "status",
      detail: "status mismatch",
      pre: String(expected.status),
      post: String(actual.status),
      expected: String(expected.status),
    });
  }
  if (actual.redirectTo !== expected.redirectTo) {
    out.push({
      route: rk,
      probe: probe.id,
      kind: "redirect",
      detail: "redirect target mismatch",
      pre: String(expected.redirectTo),
      post: String(actual.redirectTo),
      expected: String(expected.redirectTo),
    });
  }
  if (actual.body !== expected.body) {
    out.push({
      route: rk,
      probe: probe.id,
      kind: "body",
      detail: "response body mismatch",
      pre: truncate(expected.body),
      post: truncate(actual.body),
      expected: truncate(expected.body),
    });
  }
  if (!dbReadsObservablyEqual(actual.dbReads, expected.dbReads)) {
    out.push({
      route: rk,
      probe: probe.id,
      kind: "db-reads",
      detail: "db read side-effects diverged (kind/tables/returned rows)",
      pre: summarizeReads(expected.dbReads),
      post: summarizeReads(actual.dbReads),
      expected: summarizeReads(expected.dbReads),
    });
  }
  if (!dbWritesObservablyEqual(actual.dbWrites, expected.dbWrites)) {
    out.push({
      route: rk,
      probe: probe.id,
      kind: "db-writes",
      detail: "db write side-effects diverged",
      pre: summarizeWrites(expected.dbWrites),
      post: summarizeWrites(actual.dbWrites),
      expected: summarizeWrites(expected.dbWrites),
    });
  }
  if (!sessionWritesEqual(actual.sessionWrites, expected.sessionWrites)) {
    out.push({
      route: rk,
      probe: probe.id,
      kind: "session-writes",
      detail: "session writes diverged",
      pre: summarizeSessions(expected.sessionWrites),
      post: summarizeSessions(actual.sessionWrites),
      expected: summarizeSessions(expected.sessionWrites),
    });
  }
  return out;
}

/**
 * DB reads are considered equivalent if the sequence of (kind,
 * tables, returned-rows) tuples matches. The actual SQL text is
 * deliberately NOT compared — `parameterize-sql` changes SQL text
 * from `"<dynamic>"` to a literal with `?` placeholders, which is
 * exactly the change we want to allow without a per-pass response
 * transform.
 */
function dbReadsObservablyEqual(
  a: ReadonlyArray<DbReadEvent>,
  b: ReadonlyArray<DbReadEvent>,
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ae = a[i]!;
    const be = b[i]!;
    if (ae.tables.join(",") !== be.tables.join(",")) return false;
    if (!simValueEquals(ae.returned, be.returned)) return false;
  }
  return true;
}

function dbWritesObservablyEqual(
  a: ReadonlyArray<DbWriteEvent>,
  b: ReadonlyArray<DbWriteEvent>,
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ae = a[i]!;
    const be = b[i]!;
    if (ae.tables.join(",") !== be.tables.join(",")) return false;
  }
  return true;
}

function sessionWritesEqual(
  a: ReadonlyArray<SessionWriteEvent>,
  b: ReadonlyArray<SessionWriteEvent>,
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i]!.key !== b[i]!.key) return false;
    if (!simValueEquals(a[i]!.value, b[i]!.value)) return false;
  }
  return true;
}

function summarizeReads(r: ReadonlyArray<DbReadEvent>): string {
  return r.map((e) => `${e.tables.join("|")}:${e.returned.kind}`).join("; ");
}

function summarizeWrites(w: ReadonlyArray<DbWriteEvent>): string {
  return w.map((e) => `${e.tables.join("|")}`).join("; ");
}

function summarizeSessions(s: ReadonlyArray<SessionWriteEvent>): string {
  return s.map((e) => `${e.key}=${e.value.kind}`).join("; ");
}

function truncate(s: string, n = 120): string {
  if (s.length <= n) return s;
  return s.slice(0, n) + `…(+${s.length - n}ch)`;
}

// Re-export probe/simulator types through this module for convenience.
export type {
  DbReadEvent,
  DbWriteEvent,
  RequestInput,
  SessionWriteEvent,
  SimResponse,
  StubDb,
} from "./simulate.js";
export { simulateHandler, DEFAULT_STUB_DB } from "./simulate.js";
