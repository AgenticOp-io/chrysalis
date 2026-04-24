# Chrysalis — Design Document

> **This document is the north star. If something you are about to build contradicts
> this document, stop and either (a) change this document with justification, or
> (b) change your plan. Do not silently drift.**

Status: **v0.1 — foundational**
Last updated by: D22 archaeology row generics in emit-hono

---

## 1. One-sentence pitch

**Chrysalis is a web framework whose primary feature is that it can be grown inside
a legacy application and gradually consume it**, using the live application's
observed behavior — not just its source code — as the specification for translation.

The "PHP-to-TypeScript converter" is the first frontend/backend pair of a larger
system. The framework is the product; conversion is how you adopt it.

---

## 2. The core insight

Every existing converter (Rector, 2to3, js_of_ocaml, Kotlin's J2K, LLM agents)
treats **source code as the source of truth**. For legacy apps, this is wrong.
The real source of truth is distributed across:

- The **running behavior** (what the app returns for real inputs)
- The **database schema** it talks to
- The **HTML** it emits and the forms that feed it back
- The **HTTP contract** clients depend on
- The **side effects** nobody documented

Source code is one lossy projection of that truth.

Chrysalis reframes legacy modernization from a **translation problem**
(intractable) into a **specification problem** (tractable): the live app is
the spec, and code translation is just one way to satisfy it — verified, not
trusted.

---

## 3. Non-negotiable principles

These are invariants. Violating one means the project has lost its identity.

1. **The running app is the spec.** Static translation is a candidate; behavioral
   replay is the oracle. We never ship unverified translation.
2. **Partial output beats no output.** Any node that cannot be translated
   becomes a typed, compiling **hole** that calls back into the legacy runtime.
   Migration is never blocked by a single construct.
3. **Provenance everywhere.** Every generated type, schema, route, and handler
   carries metadata describing *why* it exists (which PHP file, which SQL column,
   which observed trace). Humans must be able to audit any decision.
4. **Dual-stack from day one.** The framework's shipping mode is *coexistence
   with legacy*, not replacement. Big-bang rewrites are a failure mode.
5. **Effects are types.** Every handler's type signature carries its effects.
   The compiler enforces this. No silent mutation, no hidden I/O.
6. **The IR is the product.** WebIR is the asset. Frontends and backends are
   replaceable. Keep WebIR clean, framework-agnostic, and language-agnostic.
7. **Determinism in the runtime.** Time, randomness, and I/O are injectable at
   the framework level so replay is byte-exact.
8. **Intent over syntax.** We preserve what the code was *trying to do*, not its
   surface form. `foreach`+mutation might become `.reduce`, a loop, or a
   generator depending on downstream usage.
9. **Ship to production with holes.** Correctness is measured and reported,
   never assumed. You can deploy an 87%-translated endpoint if the remaining
   13% is a hole that delegates safely.
10. **MIT or Apache-2.0 license.** GPL kills dev-tool adoption.

---

## 4. System architecture

```
                         ┌────────────────────────────────┐
 Legacy PHP app  ──────▶ │  Oracle sidecar (record)       │ ──▶ trace corpus
                         │  HTTP + SQL + outbound + time  │
                         └────────────────────────────────┘
                                         │
                                         ▼
  PHP source ──▶ parser-bridge ──▶ ingest ──▶ ┌──────────────────┐
                                              │     WebIR        │
                  DB introspection  ────────▶ │  (typed effect   │
                  HTML/form scan    ────────▶ │   graph, many    │
                  Trace corpus      ────────▶ │   dialects)      │
                                              └──────────────────┘
                                                       │
                   passes: lowering, optimization, repair (LLM-guided, verified)
                                                       │
                                                       ▼
                                        ┌──────────────────────────┐
                                        │ emit-* backends          │
                                        │  hono+drizzle (default)  │
                                        │  next+drizzle            │
                                        │  fastify+kysely          │
                                        │  (future: rust, gleam…)  │
                                        └──────────────────────────┘
                                                       │
                                                       ▼
                                       generated project + holes
                                                       │
                                                       ▼
                                        ┌──────────────────────────┐
                                        │ verify (replay oracle)   │
                                        │ green / red per endpoint │
                                        └──────────────────────────┘
                                                       │
                                                       ▼
                                        ┌──────────────────────────┐
                                        │ runtime-chimera          │
                                        │ dual-stack router,       │
                                        │ session bridge,          │
                                        │ schema lens,             │
                                        │ shadow/canary/cutover    │
                                        └──────────────────────────┘
```

---

## 5. The three signature layers

### 5.1 WebIR — a multi-dialect IR for web applications

Inspired by MLIR. Each dialect is an explicit, typed operation set. Progressive
lowering takes high-level intent to executable code without losing provenance.

Dialects (in lowering order):

| Dialect        | Purpose                                                          |
| -------------- | ---------------------------------------------------------------- |
| `web.request`  | Route → handler, request/response shapes, auth, middleware       |
| `effect`       | Explicit effect ops: `DB.read`, `DB.write`, `Mail.send`, `Session.mutate`, `Time.now`, `Random.uuid`, `Http.fetch`, `Cache.*` |
| `data`         | Pure dataflow in SSA form; scalars, records, arrays, sums        |
| `control`      | Structured control flow (loops, branches) after pure extraction  |
| `target.ts`    | TypeScript-shaped ops (for emit)                                 |
| `target.rust`  | Future                                                           |

Every node has:

- `id: NodeId` — stable, referenced by reports and repair passes
- `type: WebIRType` — static type, possibly `Unknown` or `Hole`
- `effects: EffectSet` — inferred or annotated
- `provenance: Provenance[]` — list of `{source, locator, reason}` entries
- `origin: Locator` — pointer back to PHP file:line:col (or DB/form/trace)

A **hole** is a first-class IR node with a typed input/output contract and a
callback reference into the legacy runtime. Holes compile. Holes run. Holes are
a TODO list, not a failure.

### 5.2 Oracle — record/replay as verification

The sidecar proxy runs in front of the legacy app and records:

- HTTP request (method, path, headers, body, query) + response (status, headers, body)
- SQL queries and result sets (via a DB proxy or driver shim)
- Outbound HTTP, mail, queue, cache calls
- Session mutations
- Time reads (`date()`, `microtime()`) and RNG outputs

Each record is a `TraceFrame`. A `TraceCorpus` is a persisted, deduplicated
set of frames covering the observed surface area.

Verification pipeline:

1. Translate PHP → WebIR → target code.
2. For each `TraceFrame`, run the target handler in a sandbox with:
   - Captured inputs
   - Captured time/RNG values injected via the runtime's determinism hooks
   - A fake DB that returns captured result sets for matching queries
3. Diff emitted effects + response against recorded ones.
4. Attribute each divergence to the minimal set of responsible IR nodes
   (using the `id`/`origin` metadata).
5. Emit a per-endpoint `CorrectnessReport` with a numeric score and divergence list.
6. Optionally, invoke a **repair pass** that proposes IR rewrites scoped to the
   divergent nodes. Repair proposals are re-verified — never trusted.

### 5.3 Chimera runtime — dual-stack coexistence

The production mode of Chrysalis. A small, framework-provided runtime that lets
PHP and the new stack run behind one router, sharing state.

Components:

- **Traffic router** — per-route, per-cohort, per-percentage, per-user-hash
  routing. Modes: `legacy`, `shadow` (both run, legacy wins), `canary`
  (percentage on new stack), `cutover` (new wins, legacy fallback), `done`.
- **Session bridge** — one session store behind both stacks. Default
  implementation: Redis with a PHP session handler + TS session middleware that
  speak the same serialization. Cookies unchanged.
- **Schema lens** — typed views over the existing DB shared by both sides.
  Migration of *data layout* is decoupled from migration of *code*.
- **Shadow-diff recorder** — in shadow mode, both stacks run per request; the
  diff is logged against the same report format used by `verify`. Your
  production traffic becomes a continuous conformance test.

---

## 6. Signature primitives the framework exposes to users

### 6.1 Effect-typed handlers

```ts
export const checkout: Handler<
  In<CheckoutBody>,
  Out<Redirect>,
  Effects<DB.Read<'carts'> | DB.Write<'orders'> | Mail.Send | Session.Touch>
> = async (ctx) => { ... }
```

The compiler enforces effect annotations. Adding a DB write to a read-only
handler is a type error. Effects can be *narrowed* by middleware and *widened*
only at module boundaries with explicit acknowledgement.

### 6.2 Holes

```ts
export async function legacyInvoicePdf(id: OrderId): Promise<Buffer> {
  return chrysalis.hole('legacy:invoice_pdf', { id })
}
```

Every hole is:

- Typed on both sides
- Registered in `chrysalis.holes.json` with status, owner, last-verified date
- Invocable via the chimera runtime (which forwards to legacy PHP)
- A first-class item in the CLI's migration dashboard

### 6.3 Schema archaeology output

Generated types carry provenance:

```ts
/**
 * @chrysalis-provenance
 *  id:     orders.id (db: not null, uuid)
 *  total:  orders.total (db: decimal(10,2)) ∧ checkout.php form validator (money)
 *  items:  join orders_items + observed JSON shape over 1,247 traces
 *  status: db CHECK constraint ∧ 1,247 observed values in {'pending','paid','shipped'}
 */
export type Order = { ... }
```

### 6.4 Deterministic request pipeline

The runtime exposes:

- `ctx.time.now()` — injectable, deterministic in replay
- `ctx.random.uuid()` / `ctx.random.int()` — same
- `ctx.db` — typed, auditable, replay-aware
- `ctx.http.fetch()` — recorded, replayable
- `ctx.session` — shared with legacy via the bridge

User code that bypasses these (e.g. `new Date()`) is flagged by a lint rule as
non-deterministic and will fail replay.

### 6.5 Intent-preserving rewrites

Passes that produce idiomatic output, not literal translation:

- `foreach` accumulator → `.map` / `.reduce` / loop / generator (based on
  consumer shape inferred from WebIR's data dialect)
- `$_POST['x']` + inline regex → Zod/Valibot schema at the route boundary
- Detected N+1 query patterns (found via oracle trace analysis) → batched
  DataLoader-style coalescing
- Scattered HTML echoes → JSX or a chosen template engine based on target

Each rewrite records its rule name in the node's provenance.

### 6.6 Request-level FFI

Interop unit is the **request**, not the function. Either a request runs on
legacy PHP or on the new stack. The session bridge and schema lens handle
shared state. This is the only FFI design that avoids the stateful-globals
nightmare of function-level PHP↔JS bridges.

---

## 7. Repository layout

```
PHP_converter/                  # root; will be renamed `chrysalis/` when appropriate
├── DESIGN.md                   # this document — the north star
├── ROADMAP.md                  # staged milestones, acceptance criteria
├── AGENTS.md                   # instructions to keep future agents on track
├── README.md                   # elevator pitch, quick start
├── package.json                # pnpm root
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .gitignore
├── packages/
│   ├── cli/                    # `chrysalis` command
│   ├── webir/                  # IR types, dialects, visitors, provenance
│   ├── parser-bridge/          # spawn PHP + nikic/php-parser, emit AST JSON
│   ├── ingest/                 # PHP AST → WebIR (with holes)
│   ├── oracle/                 # sidecar proxy: record + persist trace corpus
│   ├── archaeology/            # schema recovery from DB + forms + traces
│   ├── verify/                 # replay engine, divergence attribution, reports
│   ├── emit-hono/              # WebIR → Hono + Drizzle project (default target)
│   ├── runtime-chimera/        # dual-stack router, session bridge, schema lens
│   └── compat/                 # `@chrysalis/compat` — PHP stdlib shim for TS
└── fixtures/
    └── tiny-blog/              # Milestone 1 target app (5 endpoints)
```

Rules for packages:

- Each package is independently versioned and typechecked.
- No circular dependencies. `webir` has zero runtime deps.
- Backends (`emit-*`) depend on `webir`; nothing depends on backends except
  `cli`.
- `compat` is the only package published to end users' runtime.

---

## 8. Default target stack (provisional)

**Hono + Drizzle** is the first `emit-*` backend.

Rationale:
- Modern, edge-compatible, small surface area, TypeScript-native.
- Drizzle gives typed SQL without an opinionated ORM.
- Fast to demo end-to-end; shortest path to a credible Milestone 1.

This is not exclusive. The architecture requires that `emit-next`,
`emit-fastify`, and non-TS backends remain feasible. If a design choice makes
other backends harder, push back.

---

## 9. Milestone 1 — vertical slice (2–3 weeks)

Proves the thesis end-to-end on one small app.

**Target fixture:** `fixtures/tiny-blog/` — 5 PHP endpoints:
1. `GET /posts` — list
2. `GET /posts/:id` — view
3. `POST /login` — session create
4. `POST /posts` — create (auth required)
5. `POST /posts/:id/comments` — create comment

**Must demonstrate:**

- [ ] Oracle records HTTP + SQL + session traces of the PHP app in use
- [ ] `parser-bridge` produces PHP AST JSON
- [ ] `ingest` produces WebIR with at least `web.request`, `effect`, `data` dialects
- [ ] `archaeology` produces a unified `Post`, `User`, `Comment` type with provenance
- [ ] `emit-hono` produces a compiling, runnable Hono + Drizzle project
- [ ] `verify` replays every captured trace and produces a per-endpoint correctness score
- [ ] `runtime-chimera` has a working traffic router with `legacy`, `shadow`, `cutover` modes
- [ ] CLI prints a migration dashboard showing translation %, hole count, correctness score
- [ ] At least one deliberately-left hole compiles and delegates to legacy PHP

**Out of scope for Milestone 1:**

- LLM-driven repair passes (design stub only)
- Intent-preserving rewrites beyond a handful of obvious ones
- More than one emit backend
- Anything WordPress, Laravel, Symfony, or ORM-related

---

## 10. Anti-goals (things we explicitly will not do)

- We do not support full PHP semantics on day one. Missing constructs become holes.
- We do not attempt to run unmodified PHP inside TypeScript. That is a different project.
- We do not migrate the database schema. Chrysalis operates *through* the
  existing schema via the schema lens. Data migration is a separate concern.
- We do not produce "transpiled-looking" TS. Output that screams "this was
  converted from PHP" is a failure. Intent preservation > syntactic preservation.
- We do not ship features without oracle verification support. If you can't
  verify it on a trace, you can't claim to have translated it.
- We do not take on WordPress as a Milestone 1 or 2 concern. WordPress is a
  tarpit; it gets its own design spike once the core is solid.

---

## 11. Success metrics

A conversion is judged by four numbers, always reported together:

1. **Coverage** — % of PHP source nodes mapped to non-hole IR
2. **Correctness** — % of oracle traces replayed without divergence
3. **Idiomaticity** — % of nodes processed by at least one intent-preserving rewrite
4. **Residual legacy** — % of production requests still served by the legacy
   stack (measured from the chimera router)

The project's claim of groundbreaking-ness is only credible if, on real apps,
all four trend monotonically in the right direction over a migration.

---

## 12. Glossary

- **WebIR** — the multi-dialect intermediate representation at the heart of Chrysalis.
- **Dialect** — a named, typed operation set within WebIR.
- **Hole** — a first-class IR node with a typed contract and a callback into the legacy runtime; used wherever translation is incomplete.
- **Oracle** — the sidecar recorder and the replay engine together; source of behavioral truth.
- **TraceFrame / TraceCorpus** — a single recorded interaction / the persisted collection of them.
- **Chimera** — the dual-stack runtime that lets PHP and the new stack coexist.
- **Schema lens** — a typed, shared view of the legacy database used by both stacks.
- **Provenance** — metadata on every generated artifact describing why it exists.
- **Repair pass** — a (later) LLM-driven IR rewriter scoped to nodes that failed verification.
- **Intent-preserving rewrite** — a pass that replaces a literal translation with an idiomatic one based on WebIR-wide usage analysis.

---

## 13. Decision log

Append-only. When a decision here is overturned, add a new entry; never delete.

- **2026-04-21 — D1** Default first backend is Hono + Drizzle. Other backends
  remain first-class citizens of the architecture.
- **2026-04-21 — D2** WebIR is authored in TypeScript with zero runtime
  dependencies. Interop with PHP parsing happens via a subprocess bridge to
  `nikic/php-parser`, not a native JS PHP parser.
- **2026-04-21 — D3** Holes are first-class IR nodes and runtime citizens. A
  hole must compile, run, and be invocable against the legacy stack.
- **2026-04-21 — D4** The request is the FFI unit between legacy and new
  stacks. Function-level FFI is explicitly rejected.
- **2026-04-21 — D5** `parser-bridge` is provider-pluggable. `nikic/php-parser`
  via a PHP subprocess is the **canonical** provider for production use; a
  pure-JS provider (`php-parser` by glayzzle) is permitted as a **dev/fallback**
  so that contributors on systems without PHP installed can still run the
  pipeline. The public `parser-bridge` API is provider-agnostic. Golden
  fixtures are authored against the nikic output; the glayzzle provider is
  tested for shape-compatibility with those fixtures, not as a separate spec.
  This softens D2 but preserves its intent: no native JS parser is *bundled*
  as a hidden default; users explicitly choose a provider, and nikic is the
  documented recommendation.
- **2026-04-22 — D6** The Oracle **records** via a userland PHP prelude
  (`packages/oracle-php/`) loaded by `auto_prepend_file`, not via an Apache/Nginx
  proxy and not via a native Zend extension. Rationale: the prelude gives us
  file-and-line **provenance** on every captured effect (which the wire layer
  cannot), requires zero compilation (which the extension cannot), and installs
  with a single `.ini` line on any PHP 7.4+. A native extension remains on the
  roadmap as a drop-in performance upgrade for high-volume production observation
  (Milestone 4+); both implementations target the same NDJSON trace schema, so
  `verify`/`ingest` consume them interchangeably. Cross-language interception
  (MySQL wire proxy, eBPF) is explicitly **rejected** for Milestone 1 because it
  cannot attribute SQL to the source line that issued it, and that attribution
  is load-bearing for every downstream stage.
- **2026-04-22 — D7** Redaction is applied **at capture time**, in the PHP
  prelude, before any event is written to disk. There is no unredacted trace
  file. The redaction config is hashed into the trace header so traces captured
  under different policies cannot be silently compared. Rationale: the moment
  we point Chrysalis at a real application, the `traces/` directory contains
  passwords, session tokens, and PII. If redaction is a post-processing step,
  there is always a window where the raw artifact exists on disk — and in
  practice, that window is forever. Capture-time redaction eliminates the
  liability at the cost of some discarded information that can be re-captured
  by adjusting config.
- **2026-04-22 — D8** Milestone 1 `verify` replays the corpus against the
  emitted app **over HTTP**, against a **freshly-seeded database**, with
  ordered single-user cookie chaining. This is the simplest honest measurement
  we can make today: it is backend-agnostic (not tied to Hono, not tied to any
  runtime), it measures the integration surface clients actually see, and it
  catches the real bugs we have. What it does *not* do — and what Milestone 2
  will — is inject *recorded* SQL results into the emitted handler via a DB
  interceptor. Today, the replayed handler hits its own SQLite with the same
  seed PHP started from, and timestamps/auto-ids are normalized in the diff.
  The trade-off: correct replay depends on DB determinism, which is fine for
  tiny-blog but will degrade on apps that depend on wall-clock timestamps,
  `rand()`, or external calls we haven't shimmed. Fixing that is a
  SQL-replay-in-front-of-the-DB problem, not a verify problem, so it gets
  solved in the oracle layer once.
- **2026-04-22 — D10** Archaeology's Milestone 1 input set is **DDL +
  observed SQL row shapes**, not template form scans. Rationale: on
  tiny-blog, DDL covers every real column, and traces confirm which ones are
  actually read. Form scans would duplicate that evidence at higher cost
  (requires a real PHP template parser and a model of how `$_POST` flows
  into fields). We surface orphan observed shapes (observed-only columns
  not in DDL) and unknown DDL fragments explicitly in the report rather
  than papering over them. Form scans are deferred to Milestone 2 where
  they matter more: applications with dynamic form fields driven by config,
  where DDL alone will undercount.
- **2026-04-22 — D9** Verify's response diff uses **Jaccard token similarity
  over normalized bodies** rather than exact equality. Normalization rules are
  an allowlist (ISO/SQLite timestamps, session-cookie values, UUIDs,
  whitespace); anything not in the allowlist is compared strictly. The diff
  report records which normalization tags fired on each trace, so a rule that
  is silently suppressing real divergence shows up as "why did this test pass
  *because* I normalized X?" rather than being invisible. Rejected: structural
  HTML tree diff (too brittle on whitespace and attribute ordering); exact
  string equality (fails on every timestamp-rendering page and gives us zero
  signal). Token Jaccard with allowlisted normalization is the cheapest thing
  that catches real bugs without drowning us in false positives. Refinements
  (2026-04-22, same-day) applied once the CI numbers landed: (a) redirects
  (3xx) skip content-type comparison entirely — their contract is
  `status + Location`, not the body's mime; (b) non-2xx responses skip
  content-type too, since framework defaults for generic error pages differ
  (PHP tends to text/html, Node servers text/plain) and are not a
  correctness signal; (c) 4xx/5xx responses use a looser body-similarity
  threshold (0.4) than 2xx (0.9), because error bodies are conventionally
  free-form and a real format divergence (JSON↔HTML) still tokenizes
  clearly. 2xx comparison stays strict — the meaningful contract lives
  there.
- **2026-04-22 — D11** The Chimera proxy uses the **same diff primitive** as
  `verify` in shadow mode, and treats shadow mode as "verify-in-production"
  rather than a second implementation of response comparison. Concretely,
  `packages/runtime-chimera` depends on `@chrysalis/verify` and calls
  `diffResponse` on every mirrored pair. Rationale: the alternative — a
  separate diff implementation in the proxy — would inevitably drift from
  verify's semantics, and shadow-mode decisions ("is this route safe to cut
  over?") must be interchangeable with verify-mode decisions on replay data.
  Two codepaths means two thresholds, two bug surfaces, and two definitions of
  "divergence." Shadow is explicitly fire-and-observe: the mirror to the modern
  stack runs after the legacy response has already been returned to the
  client, so a slow or broken modern stack can never degrade user-visible
  latency or error rate — the worst it can do is miss divergences, which is
  recoverable.
- **2026-04-22 — D12** `chrysalis status` is the migration dashboard's
  **single surface**. It composes file artifacts written by earlier stages
  (`traces/`, `reports/verify/correctness.json`, `reports/shadow/shadow.ndjson`,
  the fixture's `schema.sql`, the PHP project for residual-legacy counting)
  rather than querying a live service. Rationale: stages run at different
  cadences (observe is interactive, verify is CI-driven, chimera is
  long-running production), and trying to aggregate them through a live API
  would force every stage to depend on the dashboard. Reading files on demand
  makes `status` a pure projection — it can run offline, in CI, or as a
  pre-commit hook — and keeps the individual stages decoupled.
- **2026-04-22 — D13** We ship a **dedicated recognition stage**
  (`@chrysalis/insight`) that walks the WebIR and catalogs legacy
  anti-patterns as `Opportunity` records, pure over the IR. The three
  launch recognizers — N+1 queries, scattered input validation, and
  string-based dispatch — were chosen for high signal-to-noise on real PHP
  code and because each has a textbook idiomatic replacement on the Node
  side (batched loaders, zod schemas, discriminated unions). Rationale
  (why a separate package, not a pass inside `emit-hono`): recognition is a
  structural query, not a lowering step; it must be re-runnable
  deterministically across rebuilds, survive emitter swaps (a future
  `emit-fastify` inherits the same catalog), and feed both the CLI
  (`chrysalis insight`) and the dashboard (`chrysalis status`). Conflating
  it with emission would couple the modernization roadmap to the backend
  choice, which is the exact inversion of what Chrysalis is about.
  Confidence scoring is *two-tier*: pure IR recognizers cap at 0.8, and the
  runner boosts toward 1.0 only when the trace corpus confirms the pattern
  (e.g. the inner N+1 query was actually observed firing N times per
  request). That keeps the catalog honest — we only promote `strong` when
  the runtime agreed with us — and paves the way for the Milestone 2
  rewriter, which will accept only corpus-confirmed opportunities for
  automatic trace-verified rewrites. Rejected alternative: having each
  recognizer own both detection and rewrite logic. Rewrite is a separate
  concern with different failure semantics (a bad detection is noise; a
  bad rewrite is a regression) and belongs in its own package once the
  catalog stabilizes.
- **2026-04-22 — D14** We add an **intra-handler taint primitive**
  (`@chrysalis/insight/taint`) as the substrate for data-flow-driven
  recognizers. The primitive is a binary lattice (`clean | tainted`) with
  a small, explicit set of sources (`data.request.field`,
  `effect.session.read`, `effect.db.query` return values) and sanitizers
  (`htmlspecialchars`, `intval`, `json_encode`, numeric coercions,
  boolean-yielding operators). Propagation is post-order and single-pass
  — sound over SSA-ish WebIR — and resolves `data.param` reads through
  the per-handler bindings map built by `collectBindings`. Rationale for
  a new primitive rather than per-recognizer ad-hoc flow: multiple
  security-oriented recognizers (`unescaped-output` for XSS,
  `raw-sql-concat` for SQLi, and upcoming open-redirect / SSRF
  recognizers) all ask the same question — "does a source reach this
  sink, unsanitized, within this handler?" — so the flow logic belongs
  in one vetted place. Sanitizer list is intentionally small and
  additive; a future iteration can promote it to a config file so users
  can register their application's own escapers. The primitive is
  deliberately conservative (false positives preferred over false
  negatives) and bounded in scope to a single handler — cross-handler
  flows are a distinct tier gated by the corpus, not a static-only
  pass. Rejected alternatives: (a) a full SMT-style dataflow engine
  (e.g. a lightweight CodeQL), which would overshoot the precision
  needed by `insight` and couple us to a larger runtime; (b) inlining
  the flow into each recognizer, which duplicates sanitizer/source
  tables and makes cross-recognizer consistency impossible to audit.
  Security-recognizer outputs are corpus-boostable exactly like
  structural ones: for `unescaped-output` we flip severity to STRONG
  when a captured response body literally contains the observed
  request-field value, which is the textbook smoking-gun confirmation
  that the unsanitized path survives in production.
- **2026-04-22 — D15** We ship a **confidence-gated IR rewrite engine**
  (`@chrysalis/rewrite`) that consumes `@chrysalis/insight` opportunities
  and produces a patched `Module`. Detection and rewrite are separate
  packages (see D13): detection is a pure structural query over the IR
  that is safe to run every build, rewriting is an effectful
  transformation that must be gated by an explicit confidence threshold
  (default 0.75) so noisy recognizers cannot flip working code. The
  engine is built around two atomic edit primitives — `add` (introduce
  a new node) and `replaceOperand` (rewire an existing node's operand
  pointer) — which together cover the vast majority of useful lifts; a
  pass that wants to "replace a whole subtree" does so by adding a new
  root and rewiring the consumer. Edits are collected across all
  opportunities and applied in a single batch, so the IR is always
  consistent at the boundary of `applyRewrites`.

  The first shipped pass, `sanitize-output`, fixes the `unescaped-output`
  recognizer's XSS findings by wrapping the tainted *leaves* of a
  concat-like echo value in `htmlspecialchars`. It deliberately walks
  the string-building tree (both explicit `data.concat` and left-folded
  `.`-binops) and consults the insight taint primitive so that literal
  HTML surrounding the taint (e.g. `<h1>`, `</h1>`) is preserved
  verbatim — the difference between a functional sanitizer and an
  over-escaper that entity-encodes the entire page. For
  `data.html.template` sinks it flips the offending expression's
  `escape: false` to `true` and wraps its operand, letting the emitter
  inherit the safe-by-default template semantics.

  Why target `htmlspecialchars` rather than the emit-target-specific
  helper: the emitter already recognizes `htmlspecialchars(x)` and
  lowers it to the appropriate helper (`escapeHtml` under the
  Hono runtime). Keeping the rewrite IR-native means future emitters
  (`emit-fastify`, `emit-bun`) inherit every rewrite in the catalog
  without changes to the rewrite engine. Rejected alternatives: (a)
  rewriting the PHP source directly, which couples us to PHP's parser
  idiosyncrasies and breaks the "IR is the portable substrate"
  invariant; (b) baking the sanitizer call into the emitter as a
  special case, which would force every target backend to duplicate
  that logic and would erase the audit trail of a rewrite as a first-
  class operation with provenance (`source: "intent-rewrite"` on the
  emitted nodes).

  Confidence threshold semantics: below threshold the opportunity is
  **skipped with a recorded reason**, not silently dropped. The CI
  rewrite-gate runs with the default threshold and asserts that
  tiny-n1's `unescaped-output` STRONG finding is applied and survives
  all the way through to the emitted TypeScript containing
  `escapeHtml(...)` — this guards the full IR → emit pipeline against
  regressions where a rewrite applied to the IR is lost in translation.
- **2026-04-22 — D16** Layer a **per-pass structural-invariant verifier**
  (`@chrysalis/rewrite/invariants`) between the rewrite engine and the
  emit stage. HTTP-level replay (`@chrysalis/verify`) is the gold-
  standard behavioral oracle, but it requires spinning up a running
  server and a full recorded corpus — too heavy to run per-opportunity
  inside `applyRewrites`. Instead each `RewritePass` now declares an
  `InvariantSpec` listing which `dialect.op` shapes it is allowed to
  mutate; `applyRewrites` runs the pass on a scratch module, compares
  the result to the pre-rewrite module, and **rolls the edit back** if
  any node outside the allowlist changed structurally or an effect
  count shifted. The opportunity is reported in the `skipped` list with
  a `verify-invariant-failed` reason and the precise violations.

  The invariant model is intentionally coarse — it cannot prove full
  behavioral equivalence (that would need a WebIR interpreter) — but
  it cheaply rules out the failure classes we care about most in an
  autonomous rewrite pipeline: a "sanitize" pass accidentally deleting
  a DB write; a pass introducing an un-provenance-tagged node (breaks
  the audit trail); a pass mutating an effect it didn't claim to
  touch. `mayModify` supports both plain `dialect.op` strings and a
  refined `{ dialectOp, attrMatch }` form so a pass can declare "I
  only touch `data.binop` *with* `operator: '.'`", preserving
  protection for arithmetic binops that share the same op name.

  The per-opportunity apply-verify-commit loop also fixes a subtler
  bug in the original batch model: later passes now see the output of
  earlier passes on the same module, so multi-pass rewrites compose
  correctly. Rejected alternatives: (a) defer all verification to
  post-emit HTTP replay — too slow to block a rewrite and leaves a
  window where the IR is known-broken on disk; (b) require passes to
  self-check via bespoke test suites — fine for library code but the
  invariant system is declarative, so every new pass gets
  "I didn't silently mutate an effect I don't own" protection for free
  without any extra test authoring.
- **2026-04-22 — D17** Ship the `parameterize-sql` rewrite pass as the
  second member of the `@chrysalis/rewrite` pass catalog. Paired with
  the `raw-sql-concat` recognizer + the taint primitive, this closes
  the SQLi half of the OWASP top-two — XSS was closed by
  `sanitize-output` under D15.

  The structural problem: PHP's `query_all("SELECT ... " . $x)` pattern
  loses the concat tree at ingest time. The original ingester just
  flagged the SQL attr as `"<dynamic>"` and moved on, which was enough
  for detection but not for rewrite (no way to recover the attacker-
  controlled leaves). Fix: ingest now preserves the full expression
  tree as a non-operand `sqlExpr` attr on the `effect.db.query` node,
  and the walkers in `@chrysalis/insight/walk.ts` treat it as a
  **virtual operand** so taint analysis reaches request fields that
  only appear inside the dynamic SQL tree. The `operands` array stays
  the bound-params contract — emit, invariants, and the recognizer's
  `anyParamTainted` check all continue to work unchanged.

  The pass walks the `sqlExpr` tree, classifying each leaf:

    - a `data.literal` of kind `string` → inlined into the rebuilt
      literal SQL string verbatim
    - everything else → emitted as a `?` placeholder, and the node
      itself is appended to `operands` (bound params)

  After rewrite the db.query has a literal `sql` attr, no `sqlExpr`,
  and a params array containing the lifted leaves. The emitted TS
  becomes `queryAll("SELECT ... WHERE id = ?", [id])` — structurally
  SQLi-proof because the SQL text contains only developer-written
  characters plus `?` placeholders.

  Invariants: the pass declares `mayModify: ["effect.db.query"]` —
  it's the narrowest possible claim and keeps the structural
  invariant verifier catching any cross-pass bug that would touch
  cookies, sessions, redirects, or response bodies.

  Rejected alternatives: (a) make `sqlExpr` a real operand (operand[0]
  = SQL tree, operands[1:] = params) — cleaner in theory but requires
  coordinated changes across the emitter, recognizer, and every
  consumer of db.query operands, and it breaks the "operands are
  bound params" mental model that's been stable since Milestone 1;
  (b) inline all leaves as params even when they're literal strings —
  structurally safe but emits `? ? ?` instead of the developer's own
  SQL keywords, making the rewritten code harder to review and
  diverging from the database's query-plan cache.
- **2026-04-22 — D18** Add a **post-rewrite analysis gate** that runs
  after a batch of rewrites lands and asserts each applied
  opportunity has actually been fixed (i.e. the recognizer that
  produced it no longer fires on the same anchor in the rewritten
  module). If any applied opportunity still fires, the driver rolls
  back the entire batch and returns the original module with every
  rewrite recorded in `skipped` for forensic inspection.

  Why a separate layer from invariants (D16): invariants catch
  **pass hygiene** ("the pass mutated a node it didn't claim to
  mutate") while post-verify catches **pass effectiveness** ("the
  pass claimed to fix finding X but the recognizer still reports
  X"). The two are complementary — invariants run per-opportunity
  (fast, granular rollback), post-verify runs once per batch (still
  cheap, one more recognizer pass) and rolls back all-or-nothing.

  All-or-nothing rollback is deliberate: partial rollback at this
  level would leave a module with a mix of "verified" and
  "unverified" rewrites, which is harder to reason about than either
  extreme. The batch of rewrites that landed together got there in a
  specific interleaving; rolling back only the bad one would produce
  a state the driver never actually traversed, and any subsequent
  re-apply would be starting from mystery data. By contrast, the
  original module is a known-good ground truth.

  Cost model: the gate runs each affected recognizer exactly once
  over the rewritten module (not once per opportunity). Recognizers
  are already designed to be cheap — they walk the handler subtree
  once and emit opportunities — so the gate typically doubles the
  recognize work but not the total rewrite work.

  Scope: post-verify cannot detect behavioral divergence that no
  recognizer notices (e.g. a rewrite that silently drops a session
  write). That's the domain of full HTTP replay via
  `@chrysalis/verify`, which is the intended D19 layer. Post-verify
  is the cheap IR-level gate that runs even without a traces corpus.

  The CLI enables post-verify by default (`chrysalis rewrite ...`
  prints `post-verify: ok` or lists the residual findings and notes
  the rollback). `--no-post-verify` exists for users who want to
  inspect a broken / partial rewrite for debugging.

- **2026-04-23 — D19** Add an **in-process IR simulator** and a
  **behavior-verify gate** that evaluates each route's handler under
  both the pre- and post-rewrite module on synthesized probe inputs
  and rolls back the batch if the post-rewrite response diverges
  from the pass-transformed pre-rewrite response.

  Why a simulator rather than HTTP replay: the typical behavioral
  oracle for migration tools is "run the old app, run the new app,
  compare traces." That requires two live deployments, a traces
  corpus, a DB in a known state, and subprocess orchestration — none
  of which is cheap or portable enough to put in the default rewrite
  pipeline. A pure-IR simulator gives us a behavioral signal with
  none of that plumbing, at the cost of only covering the ops the
  simulator understands.

  The simulator (`packages/rewrite/src/simulate.ts`) implements
  exactly the subset of WebIR ops that `@chrysalis/ingest`
  currently produces: `data.literal`, `data.request.field`,
  `data.binop` (including lazy `??`), `data.unaryop` (including
  `isset`/`empty`), `data.member`, `data.call` (with specialized
  handlers for `__assign`, `htmlspecialchars`, `intval`, `trim`,
  `strlen`, `password_verify`, `current_user`, `session_start`,
  and an `echo` fallback), `data.concat`, `data.html.template`,
  `data.block`, `data.if`/`data.ifElse`, `data.foreach`,
  `data.hole`, plus the `effect.echo`, `effect.db.query`,
  `effect.redirect`, `effect.http.error`, `effect.session.read`,
  `effect.session.write`, `effect.time.now`, `effect.random`
  effects. Unrecognized ops return a `SimError`; the gate treats
  runs with non-empty `errors` as **abstain**, not as divergence.

  The probe generator synthesizes one "benign" probe (alphanumeric
  field values) and one "attack" probe (containing classic XSS
  triggers `<script>`, `"`, `&`, `'`) per route, reading
  per-handler request-field metadata out of the IR so each probe
  targets exactly the inputs the handler actually consumes.
  Probes with no user-controlled input get only the benign case.

  The DB stub is **param-insensitive** by design: it returns a
  fixed row set keyed by `(table, kind, returns)` and ignores
  `params`. If it varied on `params`, pre-rewrite (dynamic SQL
  passed through a single concat argument, zero bound params)
  and post-rewrite (parameterized SQL, params lifted to operands)
  would always look divergent under `parameterize-sql`, defeating
  the point. The consequence: behavior-verify cannot detect
  SQL-level semantic regressions through this stub. Real DB
  semantics belong in a future HTTP-replay layer; this gate's
  contract is "IR changes outside of declared pass transforms
  don't change behavior on probe inputs."

  Pass-aware response transforms: the gate predicts what the
  post-rewrite response *should* look like by transforming the
  pre-rewrite response according to the set of applied passes:

    - `sanitize-output` — every occurrence of a probe's tainted
      input value in the pre-body should appear HTML-escaped in
      the post-body. Replaces longest tainted strings first so
      nested occurrences don't double-escape.
    - `parameterize-sql` — no predicted change. The stub's
      param-insensitivity makes the `db.query` results identical
      across pre and post; the SQL text diff (`"SELECT … " . $id`
      → `"SELECT … ?"`) is deliberately not compared.
    - All other observables (status, redirect target, session
      writes, db-write side effects, db-read tables) are expected
      to match byte-for-byte.

  Rollback is all-or-nothing for the same reason D18's is:
  partial rollback leaves a module in a state that was never
  traversed by the driver, which is strictly harder to reason
  about than the original module or the full batch.

  Positioned between D16 (pass hygiene) and an eventual
  HTTP-replay gate (D20+ — real DB, real emitted TS, real
  traces), D19 is the cheapest gate that can catch **behavioral
  regressions a recognizer would never notice**, e.g. a pass
  that silently drops an echo, swaps a redirect target, or
  adds an extraneous session write. The behavior-verify test
  suite exercises exactly that class of "evil pass."

  The gate is opt-in via `chrysalis rewrite --verify-behavior`
  rather than default, because on a module full of unsupported
  ops it would abstain on every probe and contribute nothing
  except noise to the default output. CI exercises it on
  `fixtures/tiny-n1` where the op coverage is high enough to run
  real checks.

  Rejected: making the simulator symbolic. A symbolic evaluator
  would "abstain" less often (returning a structural symbol instead
  of a concrete error) but would force every response-transform
  predicate to become symbolic too. The concrete evaluator is
  simpler, debuggable, and good enough for probes at fixed inputs.
  If we outgrow it we can layer a symbolic evaluator on top without
  reshaping the gate's contract.

  Rejected: running the simulator only on the post-rewrite module
  and hand-checking invariants. That approach can't tell you what
  *changed* — only that the post-rewrite response is "plausible."
  Comparing against a simulated pre-rewrite response gives us
  *directional* signal ("this change was not predicted by any
  applied pass") which is what actually catches regressions.

- **2026-04-23 — D20** Wire **`@chrysalis/verify` HTTP replay** into the
  rewrite driver as an **optional async gate** after D16–D19.

  **`ReplayOptions.fetch`** — `replayCorpus` accepts an injected
  `fetch` (defaults to `globalThis.fetch`). Callers pass
  `app.fetch.bind(app)` from a Hono app to replay against an
  in-process handler with no TCP listen. This is the missing
  primitive for "replay without a subprocess server."

  **`applyRewritesAsync`** — `@chrysalis/rewrite` exposes an async
  entry point that runs the same synchronous pipeline as
  `applyRewrites`, then (if `httpReplay` is set and at least one
  rewrite applied and the module was not already rolled back)
  invokes `replayCorpus` on the supplied corpus. Any frame with
  `diff.divergences.length > 0` triggers **all-or-nothing**
  rollback, same contract as D18/D19. The report gains
  `httpReplayVerify` with `outcomes` and `failedRoutes`.

  **`emit-hono` split** — generated apps now emit **`src/server.ts`**
  (defines `export const app` and `registerRoutes`) and a thin
  **`src/index.ts`** that only calls `serve({ fetch: app.fetch })`.
  Downstream tools import `./server.js` to obtain `app` without
  starting a listener.

  **Corpus vs security passes** — Traces captured from PHP encode
  *pre-fix* response bodies. After `sanitize-output`, emitted HTML
  differs by design (escaped user input). HTTP replay against a
  PHP oracle therefore only matches **byte-for-byte** when the
  batch does not change observable HTML, or when the corpus was
  re-recorded from the migrated app, or when diff rules are
  extended (future). D19 remains the gate for "escape transform
  predicted correctly"; D20 is for **runtime truth** against a
  handler that should match the oracle (e.g. `parameterize-sql`
  only, or a post-migration golden corpus).

  **CLI** — `chrysalis rewrite --http-replay <traces-dir>` requires
  `--out`. It runs `applyRewritesAsync` with `resolveFetch` that
  emits the rewritten module, runs `npm install` in the output dir
  (skip with `--http-replay-skip-install` if deps are already
  present), and loads `src/server.ts` through `tsx` for
  `replayCorpus`. On replay failure the batch rolls back and the CLI
  re-emits the **pre-rewrite** module so `--out` stays consistent
  with the returned IR.

- **2026-04-23 — preg_match lowering** — `preg_match` is lowered to
  `data.call` / `preg_match` (boolean) instead of a hole when the
  PHP prelude resolves the call. The emit-hono runtime exposes
  `pregMatch(pattern, subject)` implementing **slash-delimited**
  patterns only (closing delimiter = last `/` in the string, flags
  after it). The D19 simulator uses the same rule so behavior-verify
  stays aligned with emitted TS.   Non-slash PHP regex delimiters
  remain best-effort via `new RegExp(pattern)` in the runtime only
  when the pattern does not start with `/`.

  **Cast / ternary pseudo-calls** — Ingest lowers PHP casts to
  `data.call` with callee `__cast_int`, `__cast_float`, `__cast_string`,
  `__cast_bool`, and ternary to `__ternary`; `__array_literal` wraps
  variadic operands into a simulated array. The D19 simulator
  implements these with the same semantics as emit-hono's
  `emitKnownCall` so N+1-style handlers (e.g. tiny-n1 dashboard)
  evaluate without abstention.

- **2026-04-23 — D21** **String-dispatch `switch` emission** — `@chrysalis/emit-hono`
  emits an idiomatic TypeScript `switch` when a `data.if` head matches the
  same structural predicate as the `string-dispatch` insight recognizer.

  **`matchStringDispatchChain`** — Exported from `@chrysalis/insight`
  (implementation in `recognizers/string-dispatch.ts`). It returns the
  branch literals, `then` body node ids, optional terminal `else` body, and
  the `request.field` node id used as the discriminant. The recognizer
  delegates to this helper so detection and emission cannot drift.

  **Emit shape** — One temp holds the raw field expression; the `switch`
  discriminant is `v == null ? "" : String(v)` so behavior stays close to
  PHP loose comparisons without mapping `null` to the string `"null"`.
  Each case runs the emitted `then` body and `break`s; a terminal `else`
  becomes `default`.

  **Dependency direction** — `emit-hono` depends on `insight` for the
  matcher only. `insight` does not depend on any emit package (no cycle).

  **Non-goal in this decision** — A future IR rewrite still replaces the
  pattern with a validated `z.enum` action union at the route boundary;
  D21 is emission-only, not the full `action-union` lift from the
  opportunity catalog.

  Rejected: reimplementing the chain walk inside emit-hono. Duplicated
  rules would diverge from the recognizer and violate principle 3
  (provenance of *intent* — here, shared definition of "what counts as
  string dispatch").

- **2026-04-23 — D22** **Archaeology row generics in emit** — When callers
  supply a map from normalized SQL table name (lowercase, matching ingest
  `guessTables`) to the TypeScript interface name from archaeology
  (`EntityReport.typescriptName`), `@chrysalis/emit-hono` emits
  `queryOne<T>` / `queryAll<T>` for `effect.db.query` nodes that tag
  **exactly one** table. JOINs and other multi-table reads keep the default
  generic (`Record<string, unknown>`) so we do not assert the wrong row
  shape.

  **`domainTypesByTable`** — Built by `domainTypesByTable(report)` in
  `@chrysalis/archaeology`. `emit-hono` does not depend on archaeology;
  the CLI and `scripts/run-e2e.mjs` run archaeology, write `src/domain.ts`,
  and pass the map into `emit()`.

  **`chrysalis emit --schema <file.sql>`** — Optional path: generates
  `src/domain.ts`, then emits handlers with row generics where applicable.

  Rejected: making `emit-hono` import `@chrysalis/archaeology`. That would
  couple the default backend to schema recovery; the map is optional input
  and keeps the package graph acyclic.
