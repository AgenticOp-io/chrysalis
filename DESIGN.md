# Chrysalis — Design Document

> **This document is the north star. If something you are about to build contradicts
> this document, stop and either (a) change this document with justification, or
> (b) change your plan. Do not silently drift.**

Status: **v0.1 — foundational**
Last updated by: D165 (Milestone 6 — oracle-php mysqli query-path capture); D164 (Milestone 6 — call_user_func overlay narrowing for literal callees); D163 (Milestone 6 — ingest vendor helper effects in call overlay); D162 (Milestone 6 roadmap shell — deferred depth backlog promoted to checklist); D161 (Milestone 5 closure — checklist complete in ROADMAP); D160 (Milestone 5 — laravel-min D148-D160 method-guard pack); D147 (Milestone 5 — laravel-min POST /count method guard); D146 (Milestone 5 — laravel-min POST /session/visit method guard); D145 (Milestone 5 — laravel-min POST /session/me method guard); D144 (Milestone 5 — laravel-min GET /logout method guard); D143 (Milestone 5 — laravel-min login empty/invalid credential negatives); D142 (Milestone 5 — laravel-min bad-CSRF login negative trace); D141 (Milestone 5 — laravel-min home/db/visit/login post-capture assertions); D140 (Milestone 5 — laravel-min echo request-shape + method-guard assertions); D139 (Milestone 5 — laravel-min cross-backend verify report parity); D138 (Milestone 5 — laravel-min metadata/static route contract assertions); D137 (Milestone 5 — laravel-min verify corpus semantics: health/jump/session/login); D136 (Milestone 5 — laravel-min verify: wider `/hello` oracle + capture assertions); D135 (Milestone 5 — flagship full verify: wider `chrysalis-hello` oracle shapes); D134 (Milestone 5 — optional CI floors for idiomaticity/residual sidecars); D133 (Milestone 4–5 — laravel-min emit-stats + status sidecars + CI artifacts); D132 (Milestone 5 — pipeline-owned idiomaticity/residual sidecars + CI matrix rollup gates); D131 (Milestone 5 — matrix confidence rollup + chimera test fetch retries); D130 (Milestone 5 — confidence trend stores/enforces cross-backend parity health); D129 (Milestone 5 — cross-emitter verify report parity in five-nines gate); D128 (Milestone 5 — cookie/session header invariants in five-nines confidence gate); D127 (Milestone 5 — header contract strictness + redirect location invariants); D126 (Milestone 5 — session transition monotonicity checks in five-nines confidence gate); D125 (Milestone 5 — session idempotency assertions in five-nines confidence gate); D124 (Milestone 5 — request-shape robustness checks in five-nines gate); D123 (Milestone 5 — CI auto-switch from confidence warmup to strict trend mode); D122 (Milestone 5 — resolve laravel-min/Breeze/auth ownership boundaries); D121 (Milestone 5 — rolling confidence trend gate + stricter threshold + expanded negative-path assertions); D120 (Milestone 5 — per-cell KPI thresholds in five-nines confidence dashboard); D119 (Milestone 5 — risk-cell dashboard coverage in five-nines confidence artifact); D118 (Milestone 5 — five-nines confidence gate with negative-path + metamorphic checks + CI artifact); D117 (Milestone 5 — seed-variant replay matrix + seed-aware semantic assertions in `verify:laravel-full`); D116 (Milestone 5 — stress replay + semantic route assertions in `verify:laravel-full`); D115 (Milestone 5 — complexity ladder pack: snapshot/group-by/CTE/recursive templates + oracle); D114 (Milestone 5 — `chrysalis-ne-zero-count` template + oracle); D113 (Milestone 5 — `chrysalis-eq-zero-count` template + oracle); D112 (Milestone 5 — `chrysalis-lte-two-count` template + oracle); D111 (Milestone 5 — `chrysalis-gte-three-count` template + oracle); D110 (Milestone 5 — `chrysalis-lt-one-count` template + oracle); D109 (Milestone 5 — `chrysalis-gt-three-count` template + oracle); D108 (Milestone 5 — `chrysalis-between-one-two-count` template + oracle); D107 (Milestone 5 — `chrysalis-lte-one-count` template + oracle); D106 (Milestone 5 — `chrysalis-gte-one-count` template + oracle); D105 (Milestone 5 — `chrysalis-gt-one-count` template + oracle); D104 (Milestone 5 — `chrysalis-lt-two-count` template + oracle); D103 (Milestone 5 — `chrysalis-ne-three-count` template + oracle); D102 (Milestone 5 — `chrysalis-ne-one-count` template + oracle); D101 (Milestone 5 — `chrysalis-eq-two-count` template + oracle); D100 (Milestone 5 — `chrysalis-eq-three-count` template + oracle); D99 (Milestone 5 — `chrysalis-eq-one-count` template + oracle); D98 (Milestone 5 — `chrysalis-between-count` template + oracle); D97 (Milestone 5 — `chrysalis-ne-two-count` template + oracle); D96 (Milestone 5 — `chrysalis-lte-three-count` template + oracle); D95 (Milestone 5 — `chrysalis-gte-two-count` template + oracle); D94 (Milestone 5 — `chrysalis-lt-three-count` template + oracle); D93 (Milestone 5 — `chrysalis-gt-two-count` template + oracle); D92 (Milestone 5 — `chrysalis-odd-count` template + oracle); D91 (Milestone 5 — `chrysalis-even-count` template + oracle); D90 (Milestone 5 — `chrysalis-sum-squares` template + oracle); D89 (Milestone 5 — `chrysalis-id-span` template + oracle); D88 (Milestone 5 — `chrysalis-avg-id` template + oracle); D87 (Milestone 5 — `chrysalis-max-id` template + oracle); D86 (Milestone 5 — `chrysalis-min-id` template + oracle); D85 (Milestone 5 — Breeze in scaffold + CI); D84 (Milestone 5 phase 1 — canonical Laravel worktree); D83 (Milestone 5 roadmap shell); D82 (Milestone 4 v1 pilot closure); D81; D40 oracle footprint; D39; D38; D37 + section 9 checklist sync

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

#### Oracle footprint (static replay surface)

Before running the oracle or a full replay, WebIR alone can summarize **what must
be hydrated** per HTTP route: wall-clock / RNG effects, session edges, which
`db.read` tables imply SQL tape rows, outbound HTTP and mail, and how many
holes sit in the handler body. `@chrysalis/webir` exposes `computeOracleFootprint`
for this; `chrysalis status` (with `--project`) prints a condensed roll-up
(hydration index, read/write table hints, route counts, optional session/http/mail/cache/fs
flags) and writes `reports/oracle-footprint.json` under the project root
(schema `oracle-footprint/1.0.0`, full per-route rows). `status --json` includes
the same `routes[]` as the file. This is pure IR analysis — no PHP runtime, no
new third-party packages — and complements principle 1 (behavioral replay) by
making the **cost of honest verify** visible in CI.

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

- [x] Oracle records HTTP + SQL + session traces of the PHP app in use
- [x] `parser-bridge` produces PHP AST JSON
- [x] `ingest` produces WebIR with at least `web.request`, `effect`, `data` dialects
- [x] `archaeology` produces a unified `Post`, `User`, `Comment` type with provenance
- [x] `emit-hono` produces a compiling, runnable Hono + Drizzle project
- [x] `verify` replays every captured trace and produces a per-endpoint correctness score
- [x] `runtime-chimera` has a working traffic router with `legacy`, `shadow`, `cutover` modes
- [x] CLI prints a migration dashboard showing translation %, hole count, correctness score
- [x] At least one deliberately-left hole compiles and delegates to legacy PHP

**Out of scope for Milestone 1:**

- LLM-driven repair passes (design stub only)
- Intent-preserving rewrites beyond a handful of obvious ones
- Exhaustive alternate emit targets beyond the portability proofs in-tree (see `ROADMAP.md`; Fastify landed in Milestone 2)
- Anything WordPress, Laravel, Symfony, or ORM-related at flagship scale without a controlled pilot

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
  (`traces/`, `reports/verify/summary.json` or per-backend dirs under `reports/verify/`,
  `reports/shadow/shadow.ndjson`,
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

- **2026-04-23 — D23** **Recorded SELECT rows in verify replay** — The PHP
  PDO wrapper buffers each SELECT after `execute()` / `query()` and records
  `sql.query.rows` (JSON-safe objects, capped per query). `@chrysalis/verify`
  can attach a base64url `x-chrysalis-sql-tape` header per trace when
  `recordedSqlReplay` is on and every SELECT event has complete rows (no
  `rowsTruncated`). Emitted Hono/Fastify apps run the SQL-tape hook and satisfy
  `queryOne` / `queryAll` from the tape **in order**; `execSql` still uses
  SQLite so INSERT/UPDATE behavior stays real. CLI: `chrysalis verify
  --no-recorded-sql` disables the header.

  Rejected: replaying writes from tape — inserts/updates still execute against
  the real DB so auto-increment and constraints stay honest.

- **2026-04-23 — D24** **File JSON session bridge (demo)** — When
  `CHRYSALIS_SESSION_DIR` is set, emitted `session.ts` reads/writes
  `{sid}.json` after each request. Cookie name follows
  `CHRYSALIS_SESSION_COOKIE` (default `chrysalis_sid`). PHP can share state
  by using the same directory and cookie plus JSON-compatible keys (see
  `packages/oracle-php/README.md`). Production dual-stack should move to Redis
  or another shared service; this is the SQLite-analog "acceptable for demo"
  path from the roadmap.

  Rejected: mutating PHP's `session.save_path` alone without documenting JSON
  shape — Node and PHP must agree on payload encoding; documenting JSON is
  the minimal contract.

- **2026-04-24 — D25** **Dual-backend oracle gate (tiny-blog)** — After
  capturing a trace corpus from PHP, CI runs `scripts/verify-tiny-blog.mjs`,
  which emits the **same** WebIR module to **both** `@chrysalis/emit-hono`
  and `@chrysalis/emit-fastify`, seeds each SQLite file identically, and
  replays the corpus **in-process** via each target's `fetch` (`app.fetch`
  for Hono; `fetch` from `app.inject` for Fastify). Both must meet the same
  correctness threshold; reports land under `reports/verify/hono` and
  `reports/verify/fastify`. Rationale: one oracle, one IR — if only Hono were
  gated, Fastify could drift silently; gating both is the honest portability
  proof for Milestone 2. TCP servers for verify are no longer required for
  this fixture once injected `fetch` matches the replay contract (D20).

  Rejected: comparing only aggregate scores across backends — we persist full
  per-route reports per backend so a regression localizes to a target.

- **2026-04-24 — D26** **Rewrite HTTP-replay: multi-emitter gate** —
  `applyRewritesAsync` accepts `httpReplay.resolveFetches`, an ordered list of
  labeled `resolveFetch` callbacks. After a successful rewrite batch, the
  **same** corpus is replayed against each resolved `fetch`; **any** divergence
  rolls back the batch. The CLI exposes `--http-replay-backends=hono,fastify`
  (comma-separated, de-duplicated): Hono emits to `--out`, Fastify to
  `{out}-fastify` (or `--out` alone when Fastify is the only backend). This
  extends D25’s “one IR, many emitters” proof from CI verify into the rewrite
  pipeline so a pass cannot silently break portability.

  Rejected: hard-coding Fastify’s sibling directory name inside `@chrysalis/rewrite`
  — the package stays emitter-agnostic; only the CLI picks concrete paths.

- **2026-04-24 — D27** **Chimera canary + stickiness** — `runtime-chimera` adds
  `mode: "canary"`: same rule table as cutover, but among requests whose rule
  targets `modern`, only `canary.percentModern` (0–100) are forwarded to the
  modern stack. Bucketing uses SHA-256(`salt`, stickiness key) mod 100. Key
  derivation order: `stickinessCookie` value if present, else
  `stickinessHeader`, else `socket.remoteAddress`, so a returning user stays on
  the same stack without server-side session. Responses add
  `x-chrysalis-canary: in | out | n/a` (`n/a` when the route is legacy-eligible
  only). CLI: `--canary-percent`, optional `--canary-salt`, `--canary-cookie`,
  `--canary-header`, or `chimera.json` `canary` block.

  Rejected: random per-request sampling without a stickiness key — it would
  break UX for multi-request flows. Rejected: reading `Date.now()` or
  `Math.random()` for bucketing — hash-only inputs keep replay/debugging stable.

- **2026-04-24 — D28** **Archaeology: enums from captured SQL rows** — The
  Oracle already records `sql.query.rows` on PHP captures. `@chrysalis/archaeology`
  now harvests **string** cell values per column (bounded: max distinct count,
  max literal length, no control characters; skip non-strings). Plain DDL
  `TEXT` columns can become `"a" | "b"` unions when 2..N distinct values
  survive the cap. DDL enums (`CHECK ... IN` / `ENUM`) are **validated**:
  any trace literal not in the declared set becomes a `@chrysalis-conflict`
  on the field (DDL stays authoritative for the type).

  Rejected: unbounded union growth from high-cardinality columns — above the
  cap we omit literals and keep `string`. Rejected: inferring numeric/boolean
  unions from row JSON in this pass (string-only v1).

- **2026-04-24 — D29** **`chrysalis status` archaeology signals** — When
  `--schema` runs `runArchaeology`, the dashboard now counts **fields with any
  `conflicts`** and **fields whose provenance includes trace-promoted literal
  unions** (prefix shared as `TRACE_LITERAL_UNION_PROVENANCE_PREFIX` in
  `@chrysalis/archaeology`). Operators see merge quality at a glance without
  opening `domain.ts`.

  Rejected: parsing emitted TypeScript to infer unions — provenance on the
  `SchemaReport` is the canonical source of truth.

- **2026-04-23 — D32** **Oracle: outbound HTTP + mail in trace schema** —
  PHP observe mode registers userland stream wrappers for `http` and `https`
  that delegate to the built-in wrappers and emit `http.outbound` after each
  fetch closes (method, URL, status, response bytes, duration, PHP origin).
  Mail cannot be monkey-patched from userland; `Chrysalis\Oracle\Mail::send`
  records `mail.send` (to, subject, body byte length) before calling PHP
  `mail()`. Node `trace-schema.ts`, default redaction (`outbound.url`,
  `mail.to`, `mail.subject`), and `chrysalis corpus` summaries stay in lockstep
  with the prelude.

  Rejected: claiming full `mail()` coverage without an opt-in API — PHP offers
  no supported global hook. Rejected: depending on `curl` extension only —
  `file_get_contents('https://…')` must be observed for typical legacy code.

- **2026-04-23 — D30** **Cross-call handler effects via `lib/`** — Route files
  often call shared PHP functions (`require_login`, `current_user`, …) that
  are not inlined into the route AST. Ingest therefore parses all top-level
  `FunctionDecl` bodies under `<project>/lib/**.php` into a throwaway WebIR
  module, runs a fixpoint on `effectsReachableWithCallOverlay` so nested
  library calls merge transitively, and passes the resulting map into route
  handler effect inference so `data.call` sites union callee effects.
  Rationale: keeps a single oracle-aligned IR for routes without requiring
  whole-program PHP linking in v1; under-approximation when a callee is not
  defined under `lib/`.

  Rejected: hard-coding effect stubs only for known names — duplicating PHP
  semantics in TypeScript would drift from `lib/*.php`. Rejected: merging
  library nodes into the shipped route module — golden size and ID stability
  stay route-scoped; only effect sets cross the boundary.

- **2026-04-23 — D31** **Route-file top-level functions in call-effect map** —
  Legacy route scripts sometimes declare `function foo()` at file scope, then
  call `foo()` from the procedural body. Ingest now indexes those bodies into
  the same fixpoint map as `lib/` (names already taken by `lib/` keep the
  library definition). Handler lowering skips top-level `FunctionDecl`
  statements so they are not emitted as holes. Rationale: closes a common
  real-world gap without whole-program analysis; matches PHP’s file-scope
  function visibility for the typical “one entry script per route” layout.

  Rejected: hoisting nested `function` inside handlers in v1 — needs real scope
  / closure modeling. Rejected: auto-parsing every `*.php` under the project
  — only manifest route files plus `lib/` keep the contract explicit.

- **2026-04-23 — D33** **Verified repair loop (Milestone 3 v1)** — New package
  `@chrysalis/repair` drives `RepairProposer` → `applyModuleEdits` → full
  `replayCorpus` acceptance. CLI `chrysalis repair` wires the loop with a stub
  proposer; callers must supply real proposals (LLM or otherwise). Exported
  `applyModuleEdits` from `@chrysalis/rewrite` tags operand rewrites with
  configurable provenance (`repair-pass` in the loop). Rejected: accepting patches
  without full-corpus replay. Rejected: baking a specific LLM vendor into
  `webir` / `verify`.

- **2026-04-23 — D34** **Verify-gated hole closure (Milestone 3)** —
  `applyHoleClosure` in `@chrysalis/repair` adds a replacement subgraph,
  rewires the unique parent `replaceOperand` away from `data.hole`, and
  appends a `hand-authored` provenance entry on the replacement root recording
  the human signer (and optional note). `applyHoleClosureAndVerify` runs full
  `replayCorpus` before the closure is considered accepted. v1 rejects holes
  referenced from more than one operand site. Rejected: deleting the old hole
  `NodeId` from the map without a general `removeNode` edit — unreachable nodes
  are benign and `countHoles` is root-walk scoped.

- **2026-04-23 — D35** **Milestone 4 dashboard roll-up** — `chrysalis status`
  always includes a `migration` object: **coverage** from
  `irCoverageStats(module)` when `--project` ingests WebIR; **correctness**
  mirrors the verify-report aggregate; **idiomaticity** and **residual legacy
  request %** read optional JSON sidecars under `reports/migration/` (or
  `--migration-reports`) so CI and chimera can feed signals without new core
  dependencies. Milestone 4’s flagship target is documented as Laravel-first in
  `ROADMAP.md` / `flagship/README.md`.

  Rejected: hard-coding Laravel paths in `status` — only generic sidecars and
  IR coverage belong in core CLI.

- **2026-04-23 — D36** **Flagship skeleton (`flagship/laravel-min`)** — A
  Laravel-**shaped** tree (e.g. `public/index.php`, `app/Http/Handlers/`) with
  `chrysalis.routes.json` proves ingest + emit on a second app layout without
  vendoring Composer Laravel in-repo. Real Breeze (or similar) stays a
  documented follow-up; oracle + verify for the flagship mirror `tiny-blog` when
  routes gain DB/session.

  Rejected: committing `vendor/` or a full framework tree as the default M4
  slice — blows CI time and review surface; the skeleton stays procedural PHP
  until the pilot explicitly opts into framework bootstrap.

  **Observe docroot:** Laravel-style apps use `public/` as the PHP server root;
  `startObserver({ phpRoot })` must point at `public/`, while
  `loadObserveConfig` and `ingestDirectory` use the project root (where
  `chrysalis.observe.json` and `chrysalis.routes.json` live). See
  `scripts/verify-flagship-laravel-min.mjs`.

- **2026-04-23 — D37** **Injectable clock/PRNG in emitted apps + verify wiring** —
  Emitted Hono/Fastify stacks ship `src/ctx.ts` (`chrysalisNow`, `chrysalisRandom`,
  optional request middleware reading `x-chrysalis-now-iso` and
  `x-chrysalis-random-seed`). Ingest lowers PHP `time()`, `rand`/`mt_rand`/`random_int`,
  `microtime(true)`, `uniqid` (literal entropy flag), `getrandmax`/`mt_getrandmax`,
  and `parse_url` with a `PHP_URL_*` component to WebIR/effects or runtime helpers
  (`parseUrlComponent`); remaining shapes stay holes. `@chrysalis/verify` replay
  sends those headers by default from trace `startedAt` and a deterministic FNV-1a
  seed of `traceId` (`injectDeterminismHeaders: false` to disable). Rationale:
  honors principle 7 (determinism in the runtime) for generated handlers without
  reading wall clock or `Math.random` in handler bodies when the IR marks the effects.

  Rejected: silently translating nondeterministic PHP builtins to raw `Date`/`Math`
  in handlers.   Rejected: expanding `uniqid`/`microtime` to full PHP bit-accuracy in
  v1 — documented approximations and holes where needed.

- **2026-04-23 — D38** **`microtime()` string mode + `parse_url($url)` array-like
  lowering** — `microtime()` / `microtime(false)` lower to `effect.time.now`
  (`epoch_float`) wrapped by runtime `microtimeString` (injectable wall clock).
  Single-argument `parse_url` lowers to `parseUrlParts` → `Record<string, string>`
  with PHP-shaped keys (`scheme`, `host`, `port`, …); parse failures yield `{}`
  (PHP returns `false` — callers that branch on false may need a follow-up).
  Rationale: closes common front-controller patterns without `Date`/`Math` in
  handlers for those paths.

  Rejected: returning literal `false` from `parseUrlParts` in TS (breaks typed
  record consumers); use empty object + optional chaining in emitted PHP style.

- **2026-04-23 — D39** **Oracle footprint (static WebIR)** — `computeOracleFootprint`
  in `@chrysalis/webir` walks each `web.request.route` → handler body, unions
  reachable effects (`effectsReachableFrom`), aggregates `db.read` tables as a
  tape hint, flags time/RNG/session/http/mail, counts holes and reachable nodes
  per route, and derives a **hydration index** (0–100) from a weighted score
  normalized per route. `chrysalis status` surfaces a condensed summary after
  ingest. Rationale: teams need a first-party signal for “how heavy is honest
  replay for this module?” without running PHP or adding migration-tooling
  dependencies; the IR already encodes the effect surface.

  Rejected: inferring footprint from emitted TypeScript or from trace files only
  — WebIR stays the single portable truth; traces refine replay but do not
  replace static effect summaries for greenfield CI.

- **2026-04-23 — D40** **Oracle footprint artifact and full effect surface** —
  Footprint aggregates `cache.read` / `cache.write` and `fs.read` / `fs.write`,
  distinct **`db.write`** tables (`writeTablesHint`), and **`totalHoleCount`**
  across routes. `chrysalis status --project` persists
  `reports/oracle-footprint.json` (versioned `chrysalisSchema`) for CI and
  diffing; machine consumers use that file or `status --json` (`routes[]`).

  Rejected: treating write tables as replay tape rows in the same list as reads
  — writes shape DB state; the hint names tables that need seeding or isolation,
  not SELECT result replay.

- **2026-04-24 — D41** **CI gates: structured checks, WebIR stays truth** —
  GitHub Actions use `scripts/ci-gates.mjs` for migration/oracle-footprint JSON
  invariants, tiny-n1 insight catalog counts, rewrite pre-baseline XSS findings,
  and post-rewrite emitted-handler checks. Emitted TypeScript is validated with the
  TypeScript compiler API (e.g. `escapeHtml(...)` calls, no `+`-built SQL first
  argument to `queryAll`/`queryOne`/`execSql`) instead of regex on source text.
  Rationale: matches principle that **WebIR is the owned intermediate language**
  (oracle footprint and coverage still come from IR + traces), while **edges**
  use boring, explicit scripts; the **host toolchain remains TypeScript** (no new
  GP language, no host rewrite).

  Rejected: expanding CI with more string-matching on generated `.ts` without
  structure — high false positive/negative rate and obscures real regressions.
  CI JSON readers strip a UTF-8 BOM so artifacts stay valid across platforms.

- **2026-04-24 — D42** **N+1 batching helpers (emit + simulator)** — Emitted
  apps include `queryAllWhereIn(selectList, table, idColumn, ids)` on `db.js`
  (static SQL identifiers only; dynamic data is the id list). `runtime.js`
  adds `chrysalisPluck` and `chrysalisRowByColumn`. WebIR may reference these
  via internal `data.call` callees `__chrysalis_query_all_where_in`,
  `__chrysalis_pluck`, and `__chrysalis_row_by_column` lowered by
  `@chrysalis/emit-shared`; the IR simulator records the batch call as a
  `db.read` for D19. Rationale: unblocks the `batch-n1-read` rewrite pass
  without inventing a new emit backend; SQL tape shape will change when a batch
  replaces per-row queries (regenerate corpora or extend replay matching).

  Rejected: dynamic table/column strings from request input in `queryAllWhereIn`
  — that reintroduces injection; only codegen literals are allowed.

- **2026-04-23 — D43** **`batch-n1-read` rewrite pass** — `@chrysalis/rewrite`
  ships `batch-n1-read` (in `DEFAULT_PASSES` after `parameterize-sql`). It
  splices batched-load `data.call` nodes (`__chrysalis_pluck`,
  `__chrysalis_query_all_where_in`, `__chrysalis_row_by_column`) ahead of a
  qualifying foreach and rewires the inner `__assign` (v1 scope: one inner
  read, param iterable, `row-or-null`, non-`SELECT *`, FK from loop row).
  **D19:** when this pass applies, expected `dbReads` for a probe are aligned
  with the **post** simulation, not the generic pre→post predictor, so fewer
  executed reads after batching do not roll the batch back. Invariants omit
  `effect.db.query` from strict effect-count preservation because orphaned inner
  query nodes may remain in the graph while executed reads shrink.

  Rejected: silently rewriting N+1 patterns that violate v1 preconditions —
  the pass throws or is skipped; unsupported shapes remain insight findings
  until a broader pass or manual fix.

- **2026-04-23 — D44** **`boundary-zod` + foreach reduce + multi-inner N+1** —
  **`boundary-zod`** rewrites `scattered-validation` opportunities on POST
  fields: clone one `request.field`, `__chrysalis_zod_body_field` →
  `parseZodBodyFieldRaw` in emit (dependency-free string normalization aligned
  with the D19 simulator). **`foreach` reduce:** compound assignment in ingest;
  emit prefers `Array.reduce` when init + foreach + accumulating assign match a
  strict structural pattern. **`batch-n1-read`** batches multiple inner reads in
  one application when each satisfies the existing SQL/FK/`__assign`
  preconditions.

  Rejected: adding a hard npm `zod` dependency to every emitted app — the helper
  matches the simulator; projects may add `zod` at the app layer when they want
  full schema objects.

- **2026-04-24 — D45** **Milestone 2 closure — archaeology form signal + dispatch
  union + effect widening + batch `SELECT *`.** (1) **Archaeology:** optional
  recursive scan of `.php` sources for inline `<input|select|textarea name=…>`
  (heuristic SQL-in-file + INSERT/UPDATE tie-break for shared column names);
  merged as `form` provenance on entity fields, with unattributed controls
  surfaced in reports. This **does not** replace D10’s point that Milestone 1
  archaeology was **DDL + trace shapes** only; there is still no full Twig/Blade
  template parser — only text embedded in PHP. (2) **`dispatch-union-zod`:**
  `string-dispatch` opportunities get a dependency-free enum-shaped boundary
  (`parseZodEnumBodyFieldRaw`) plus `data.param` rewire; D19 simulator and emit
  stay aligned. (3) **Effects:** `call_user_func*`, `call_user_func_array`,
  `forward_static_call`, and `forward_static_call_array` union **all** callee
  effects from the overlay map (sound over-approximation); nested `FunctionDecl`
  bodies under `lib/**` and route files participate in `buildCallEffectMap`.
  (4) **`batch-n1-read`:** inner `SELECT *` is batchable by projecting the FK /
  `WHERE` column as the hoisted select list (D43’s “no `SELECT *`” v1 note is
  superseded for this narrow case). **Explicitly not part of M2 closure:**
  Composer vendor resolution, effect narrowing, bare inner reads without
  `__assign`, corpus-only batch confidence gating, and a first-class `mysqli`
  oracle driver remain follow-ons.

- **2026-04-24 — D46** **Opt-in HTTP chat repair proposer (Milestone 3).**
  `chrysalis repair --llm` with `CHRYSALIS_REPAIR_LLM_API_KEY` calls an
  OpenAI-compatible Chat Completions endpoint from the **CLI / repair package**
  only. The model returns JSON describing `replaceOperand` edits; the package
  validates node ids against the WebIR module before `applyModuleEdits`, and
  **`runVerifiedRepairLoop` still requires a full-corpus replay** to accept a
  patch. This does **not** relax D3 / AGENTS rules about network or
  non-injected time/random in **generated** handlers — it is developer tooling,
  not emitted runtime.

- **2026-04-24 — D47** **Hole-closure patch file + repair diagnostics (Milestone 3).**
  `parseHoleClosurePatchJson` accepts a JSON document describing
  `applyHoleClosure` inputs (hole id, replacement subgraph nodes, human
  `signOff`). `chrysalis repair … --hole-patch <file.json>` ingests the PHP
  project, applies closure once, and accepts it only if **full-corpus replay**
  passes (same bar as the LLM loop). Optional `--repair-verbose` /
  `CHRYSALIS_REPAIR_VERBOSE` logs non-fatal HTTP chat proposer diagnostics to
  stderr without changing the verify gate.

- **2026-04-24 — D48** **Repair snapshot export + stricter hole-patch validation.**
  After a **successful** `chrysalis repair` (hole-patch path or verify-gated
  loop), optional `--write-module <path>` writes a deterministic WebIR JSON
  snapshot via `moduleToGoldenSnapshot` (relative PHP/form locators to
  `--project`). `parseHoleClosurePatchJson` now rejects unknown `Effect.kind`
  and `WebIRType.kind` strings so hand-edited patches cannot silently drift
  from the lattice.

- **2026-04-24 — D49** **Milestone 3 closure.** The repair vertical slice is
  **complete for v1**: verify-gated `runVerifiedRepairLoop`, opt-in HTTP chat
  `RepairProposer`, human `hole-patch` JSON with the same replay bar, module
  snapshot export, and diagnostics env/flags. **Deferred** (not blocking): finer
  emit↔IR divergence maps, composite proposers, and any repair that weakens the
  full-corpus gate. Execution focus moves to **Milestone 4** (flagship app and
  monotonic migration metrics on `main`).

- **2026-04-24 — D50** **Flagship `laravel-min`: Composer path + DB route + wider
  oracle corpus.** The skeleton ships **`composer.json`** (PHP constraint +
  `autoload.files` for `app/autoload.php`); CI runs **`composer install`** so
  `public/index.php` can load **`vendor/autoload.php`** without vendoring that
  tree in git. **`GET /items`** reads SQLite via the same **`query_all`** surface
  as `fixtures/tiny-blog` (ingest/emit parity, oracle SQL capture). The flagship
  verify script seeds **`data/app.sqlite`** from **`schema.sql`**, replays the
  same DDL+DML into each emitted **`blog.sqlite`**, and **drives six HTTP hits**
  across three routes before dual-backend replay — stretching the corpus while
  keeping the existing correctness gate.

- **2026-04-24 — D51** **`laravel-min` `GET /count` (`query_one`).** Adds a fourth
  manifest route that reads **`SELECT COUNT(*) AS c FROM items`** via the same
  **`query_one`** lowering as tiny-blog (read-only aggregate, safe for oracle +
  dual emit replay). The flagship verify driver now exercises **four routes**
  with **eight sequential hits** before replay, further stress-testing routing,
  SQL capture, and migration status without mutating fixture rows during capture.

- **2026-04-24 — D52** **`laravel-min` session-aware counter (`GET /session/visit`).**
  Adds a sixth manifest route using PHP **`session_name('chrysalis_sid')`** (same
  default as emitted **`session.ts`**) plus **`$_SESSION['visits']`** read/write
  after **`session_start()`**. The flagship verify driver issues **two** sequential
  hits on that path (after the existing GET/POST mix) so **`@chrysalis/verify`**
  cookie chaining matches emitted session persistence; replay sets
  **`CHRYSALIS_SESSION_DIR`** under each generated app so file-backed session JSON
  is empty at corpus start, mirroring SQL replay hygiene. Ingest lowers
  **`session_name`** and **`session_set_cookie_params`** to the same void stub as
  **`session_start()`** (middleware owns cookie policy in emitted TypeScript).

- **2026-04-24 — D53** **`laravel-min` `GET /hello` (query string).** Adds a seventh
  manifest route that echoes **`$_GET['name']`** (with **`trim`** and **`??`**)
  as plain text so the flagship oracle driver records **query-shaped** HTTP
  requests; verify hits **`/hello`** twice with different **`name=`** values to
  widen the corpus without new server-side mutable state beyond existing session
  and SQL paths.

- **2026-04-24 — D54** **`laravel-min` session login + `me` (`POST /session/login`,
  `GET /session/me`).** Adds two manifest routes so the oracle records a minimal
  **anonymous read → form login → authenticated read** sequence on the same
  PHP session cookie as the visit counter; verify replays it with the same
  **`CHRYSALIS_SESSION_DIR`** discipline as D52. The driver also widens the base
  **`GET`/`items`/`count`** loop to **ten** hits before query/echo/session phases.

- **2026-04-24 — D55** **`laravel-min` `GET /jump` (redirect).** Adds a manifest route
  that issues **`header('Location: /health')`** then **`exit`**, lowering to the
  same **`effect.redirect`** path as tiny-blog logins. The flagship verify driver
  records a   **`GET /jump`** with **`redirect: manual`** so the oracle preserves the
  **3xx + `Location`** contract for dual-emit replay (no automatic follow).

- **2026-04-24 — D56** **`laravel-min` production-shaped session auth (fixture).**
  Replaces naive body-only session login with **`GET /login`** (HTML form + static
  **`csrf`** in session), **`POST /login`** (**`query_one`** + **`password_verify`**,
  redirect on success), and **`POST /logout`** (clears session user id, redirects).
  **`schema.sql`** gains a **`users`** table; **`verify-flagship-laravel-min.mjs`**
  bcrypt-seeds **`secret`** for user **`flagship`** on both fixture and emitted
  **`blog.sqlite`** via PHP **`password_hash`** so oracle and replay stay aligned.
  CSRF is **deterministic** in this skeleton (not production-grade entropy); real
  apps still need token rotation and origin checks beyond this pilot.

- **2026-04-24 — D57** **`laravel-min` `GET /api/health` (JSON).** Adds a read-only
  JSON health endpoint with explicit **`Content-Type: application/json`** and a
  fixed **`{"ok":true,"app":"laravel-min"}`** body (no **`json_encode`** in PHP, so
  ingest/emit stay on the echo/redirect surfaces already gated in CI). The flagship
  verify driver hits **`/api/health`** twice (mid-corpus and after the auth/logout
  tail) to widen the oracle without new mutable server state.

- **2026-04-24 — D58** **`laravel-min` `GET /robots.txt`.** Adds a plain-text crawl
  policy endpoint (common production surface) and includes **`/robots.txt`** in the
  flagship verify script’s base **`GET`** fan-out so the oracle records another
  stable path alongside HTML, JSON, redirects, SQL, and session flows.

- **2026-04-24 — D59** **`laravel-min` `GET /humans.txt`.** Adds a deterministic
  plain-text **`humans.txt`** endpoint (common public metadata surface) and one more
  **`GET`** in the flagship verify driver’s base path loop so the oracle corpus grows
  without new mutable server state.

- **2026-04-24 — D60** **`laravel-min` `GET /.well-known/security.txt`.** Adds a
  deterministic RFC 9116-style **`security.txt`** document at the well-known path (fixture
  **`Contact`** / **`Acknowledgments`** lines only, no live security workflow) and extends
  the verify driver’s base **`GET`** loop so emitted stacks exercise multi-segment static
  paths alongside the existing pilot surfaces.

- **2026-04-24 — D61** **`laravel-min` `GET /sitemap.xml`.** Adds a minimal deterministic
  XML sitemap (**`application/xml`**, single fixture URL) and one more base-loop **`GET`**
  so the oracle records another common production content type without dynamic URL generation
  or database reads.

- **2026-04-24 — D62** **`laravel-min` `GET /css/pilot.css`.** Adds a deterministic static
  stylesheet (**`text/css`**, Laravel-shaped **`public/css/...`** URL) and one more base-loop
  **`GET`** so routing and replay cover a nested static asset path alongside metadata and API
  surfaces.

- **2026-04-24 — D63** **`laravel-min` `GET /manifest.webmanifest`.** Adds a minimal Web App
  Manifest (**`application/manifest+json`**, literal JSON echo like **`/api/health`**, no
  **`json_encode`**) and one more base-loop **`GET`** so the oracle sees the standard PWA
  metadata filename alongside other static surfaces.

- **2026-04-24 — D64** **Composer Laravel adoption track (`flagship/laravel-full`).**
  Adds documentation + **`chrysalis.routes.example.json`** for a real **`composer
  create-project`** tree, **`pnpm run scaffold:laravel-full`** (`scripts/scaffold-flagship-laravel.mjs`)
  that writes **`flagship/chrysalis-laravel-work/`** (gitignored), and cross-links from
  **`laravel-min`** / **`flagship/README.md`**. Does **not** vendor Laravel in git; CI remains
  on **`laravel-min`** until bounded handler manifests and verify corpora exist for the
  Composer-backed app.

- **2026-04-24 — D65** **`laravel-full/chrysalis-templates` + scaffold wiring.** Ships a
  committed **ingestable** slice (`GET /chrysalis-ping`, literal string return) and a Laravel
  **`routes/chrysalis.php`** stub merged by **`scaffold-flagship-laravel.mjs`** (append
  **`require`** to **`routes/web.php`** when missing). Re-running the scaffold on an existing
  Composer tree **re-syncs** templates without re-downloading Laravel. Vitest covers ingest of
  the template root; runtime PHP still requires Composer + **`php artisan serve`** locally.

- **2026-04-24 — D66** **`verify:laravel-full` (optional Oracle + dual verify).** Adds
  **`scripts/verify-flagship-laravel-full.mjs`** and **`pnpm run verify:laravel-full`**: skips when
  PHP is missing or **`flagship/chrysalis-laravel-work`** lacks **`vendor/`** / **`public/index.php`**;
  otherwise captures **`GET /chrysalis-ping`** twice, ingests the Composer tree, dual-emits, replays
  with the same **`blog.sqlite`** bootstrap as **`laravel-min`** verify for harness parity. CI runs
  the script after **`verify-flagship-laravel-min`** (no-op skip until a cached scaffold tree exists).

- **2026-04-24 — D67** **`chrysalis-templates` second route + emit parity.** Adds **`GET /chrysalis-health.txt`**
  (`health_txt_show.php`), Laravel **`routes/chrysalis.php`** wiring, widens **`verify:laravel-full`**
  corpus (four GETs), and Vitest emit-hono / emit-fastify coverage for the two-handler template slice
  alongside **`laravel-min`**.

- **2026-04-24 — D68** **Optional `status:laravel-full` migration roll-up.** Adds
  **`scripts/status-flagship-laravel-full.mjs`** and **`pnpm run status:laravel-full`**:
  skip when scaffold/traces/reports are absent; otherwise run `chrysalis status --json` for
  **`flagship/chrysalis-laravel-work`**, enforce **`status-migration`** gate, and write
  **`reports/migration/flagship-laravel-full.json`**.

- **2026-04-24 — D69** **Dedicated CI job for Composer Laravel scaffold verify/status.**
  Moves `laravel-full` checks out of the `laravel-min` job into
  **`verify flagship (laravel-full scaffold)`** with separate artifacts and cache-backed
  reuse of both Composer package cache and the scaffolded
  **`flagship/chrysalis-laravel-work`** tree keyed by scaffold/templates inputs.

- **2026-04-24 — D70** **Composer template corpus widened (JSON + redirect).**
  Extends `laravel-full/chrysalis-templates` with **`GET /api/chrysalis-health`**
  (`application/json`, literal body) and **`GET /chrysalis-jump`** (302 redirect to
  `/chrysalis-health.txt`) alongside existing text endpoints; verify driver now records
  these paths and emit parity tests require four template handlers across Hono/Fastify.

- **2026-04-24 — D71** **Composer template session route (`/chrysalis-session/visit`).**
  Adds deterministic session counter behavior to `laravel-full/chrysalis-templates`
  (`session_name('chrysalis_sid')`, `session_start`, `$_SESSION['visits']` increment,
  JSON body), updates Laravel route stub + verify corpus, and requires five template
  handlers in ingest/emit parity tests (Hono/Fastify).

- **2026-04-24 — D72** **Composer template POST echo route (`/chrysalis-echo`).**
  Adds a bounded form POST surface to `laravel-full/chrysalis-templates` (`echo_post.php`,
  URL-encoded `msg` input, JSON response), widens `verify:laravel-full` with two POST bodies,
  and raises template ingest/emit parity to six handlers across Hono/Fastify.

- **2026-04-24 — D73** **Composer template query route (`/chrysalis-hello`).**
  Adds a deterministic query-parameter surface (`hello_show.php`, `$_GET['name']` + `trim`)
  to `laravel-full/chrysalis-templates`, widens `verify:laravel-full` with two
  `GET /chrysalis-hello?name=...` hits, and raises template ingest/emit parity to seven
  handlers across Hono/Fastify.

- **2026-04-24 — D74** **Composer template auth-like session trio (`me/login/logout`).**
  Adds bounded session read/write surfaces to `laravel-full/chrysalis-templates`:
  **`GET /chrysalis-session/me`**, **`POST /chrysalis-session/login`**
  (`username=flagship`), and **`POST /chrysalis-session/logout`**. Verify corpus now
  exercises the `me → login → me → logout → me` sequence; template ingest/emit parity
  rises to ten handlers across Hono/Fastify.

- **2026-04-24 — D75** **Composer template DB-count route (`/chrysalis-count`).**
  Adds a bounded SQL-read surface backed by template-local SQLite
  (`chrysalis/lib/db.php`, `chrysalis/schema.sql`, `count_show.php`) and seeds the same
  schema for fixture + emitted replay in `verify:laravel-full`. Template ingest/emit parity
  rises to eleven handlers across Hono/Fastify.

- **2026-04-24 — D76** **Composer template framework-wrapper route (`/chrysalis-framework`).**
  Adds one bounded Laravel service-wrapper surface in `routes/chrysalis.php`: route
  ownership still comes from explicit `chrysalis.routes.json` + procedural handler
  (`framework_show.php`), while the runtime response is created through Laravel's
  `ResponseFactory` resolved from the service container. Verify corpus adds
  `GET /chrysalis-framework` x2 and template ingest/emit parity rises to twelve handlers
  across Hono/Fastify.

- **2026-04-24 — D77** **Composer template DB-first-item route (`/chrysalis-first-item`).**
  Adds a second bounded SQL-read shape over the template-local SQLite surface:
  `first_item_show.php` returns the first seeded item name from
  `SELECT name FROM items ORDER BY id ASC LIMIT 1`. Verify corpus adds
  `GET /chrysalis-first-item` x2 and template ingest/emit parity rises to thirteen
  handlers across Hono/Fastify.

- **2026-04-24 — D78** **Composer template items list route (`/chrysalis-items`).**
  Extends template-local `chrysalis/lib/db.php` with **`query_all`** and adds
  `items_list_show.php`: **`SELECT id, name FROM items ORDER BY id ASC`** plus a
  bounded **`foreach`** that builds the same plain-text lines as `laravel-min`
  **`GET /items`**. Verify corpus adds **`GET /chrysalis-items`** x2; template
  ingest/emit parity rises to fourteen handlers across Hono/Fastify.

- **2026-04-24 — D79** **Composer template second aggregate JSON route (`/chrysalis-lib-count`).**
  Adds **`lib_count_show.php`**: same bounded **`query_one`** aggregate as **`/chrysalis-count`**, but
  returns **`{"countViaLib":…}`** so the oracle + dual replay corpus exercises an additional JSON
  envelope without new SQL shapes. **Note:** ingest widens effects for same-file and **`lib/**`**
  helpers (D31/D30), but **`emit-*`** still records emit-time holes for **`data.call`** to arbitrary
  PHP function names that are not in **`emitKnownCall`**; this handler stays **inline-only** so the
  flagship slice remains **zero-hole** until callee emission is generalized. Verify adds
  **`GET /chrysalis-lib-count`** x2; template ingest/emit parity rises to fifteen handlers across Hono/Fastify.

- **2026-04-24 — D80** **Composer template DB-last-item route (`/chrysalis-last-item`).**
  Adds **`last_item_show.php`**: **`SELECT name FROM items ORDER BY id DESC LIMIT 1`** with the same
  literal JSON concatenation pattern as **`/chrysalis-first-item`**, so the seeded SQLite corpus
  records a second single-row read with inverted ordering (deterministic **`charlie`** on the template
  schema). Verify adds **`GET /chrysalis-last-item`** x2; template ingest/emit parity rises to sixteen
  handlers across Hono/Fastify.

- **2026-04-24 — D81** **Composer template `SUM(id)` aggregate route (`/chrysalis-sum-ids`).**
  Adds **`sum_ids_show.php`**: **`SELECT SUM(id) AS s FROM items`** via **`query_one`**, returning
  **`{"sumIds":6}`** on the seeded three-row **`items`** table (ids 1..3). Verify adds
  **`GET /chrysalis-sum-ids`** x2; template ingest/emit parity rises to seventeen handlers across Hono/Fastify.

- **2026-04-25 — D82** **Milestone 4 v1 pilot closure.** The **Milestone 4 phased checklist**
  in `ROADMAP.md` is complete: **`flagship/laravel-min`** (Laravel-shaped tree, Composer autoload,
  multi-route oracle driver, dual emit + verify in CI, migration + oracle-footprint artifacts) and
  **`flagship/laravel-full`** (bounded **`chrysalis-templates/`** slice, scaffold, optional verify/status,
  dedicated CI). **Coverage** and **correctness** are reproducible from `chrysalis status --json` inputs
  documented in `flagship/README.md`; **idiomaticity** and **residual legacy** remain optional sidecars
  until a pipeline owns those files. **Explicitly not claimed as closed:** full Composer **Breeze**
  product surface, production-grade rotating CSRF / gateways / MFA, and arbitrary **`lib/`** PHP callee
  emission without emit-time holes (see D79). Follow-on work stays under **Milestone 4+** in `ROADMAP.md`
  until a future milestone split is warranted.

- **2026-04-25 — D83** **Milestone 5 roadmap shell (flagship depth, draft).** `ROADMAP.md`
  names **Milestone 5 — Flagship depth (draft)** as the successor track for former **Milestone 4+**
  items (tracked Composer flagship, optional Breeze, production auth where owned, larger corpora,
  optional idiomaticity/residual-legacy gates). **No new product claims** at introduction beyond
  naming the track; M4 v1 acceptance is unchanged (D82). The first concrete M5 checklist item
  (canonical Composer worktree + CI) is recorded under **D84**.

- **2026-04-25 — D84** **Milestone 5 phase 1 — canonical Composer Laravel worktree.** The repo
  **starts** M5 by naming **`flagship/chrysalis-laravel-work/`** (materialized by
  **`pnpm run scaffold:laravel-full`**, gitignored) as the **canonical full Laravel** ingest and
  oracle root alongside the existing CI job **`verify flagship (laravel-full scaffold)`**.
  **`flagship/laravel-min/`** remains the **Laravel-shaped** fast fixture and verify harness until a
  later item explicitly merges or replaces it; no vendor tree is committed to git.

- **2026-04-25 — D85** **Milestone 5 — optional Laravel Breeze in the canonical worktree.** The
  scaffold script (`scripts/scaffold-flagship-laravel.mjs`) accepts **`--with-breeze`** or env
  **`CHRYSALIS_SCAFFOLD_BREEZE=1`** ( **`pnpm run scaffold:laravel-full:breeze`** ). When set, after
  **`composer create-project`** (or on an existing tree without **`laravel/breeze`**), it runs
  **`composer require laravel/breeze --dev`**, **`php artisan breeze:install blade --no-interaction --pest`**,
  **`php artisan migrate --force`**, ensures **`database/database.sqlite`**, then **`npm ci`/`npm install`**
  and **`npm run build`**, then copies Chrysalis templates and re-appends **`routes/chrysalis.php`**
  to **`routes/web.php`**. CI enables the env flag on **`verify flagship (laravel-full scaffold)`** so
  **`verify:laravel-full`** continuously validates coexistence. **Ingest scope is unchanged:** only
  files listed in **`chrysalis.routes.json`** are translated; Breeze’s published PHP is ignored until
  explicitly routed in the manifest. **Not claimed:** ingest/verify parity on Breeze’s auth Blade stack
  (deferred ROADMAP item).

- **2026-04-25 — D86** **Composer template `MIN(id)` aggregate route (`/chrysalis-min-id`).**
  Adds **`min_id_show.php`**: **`SELECT MIN(id) AS m FROM items`** via **`query_one`**, returning
  **`{"minId":1}`** on the seeded three-row **`items`** table. **`chrysalis.routes.json`**, **`routes/chrysalis.stub.php`**,
  **`verify-flagship-laravel-full.mjs`** (two **`GET`** captures), ingest + dual-emit parity tests, and
  README counts move to **eighteen** template handlers. Does **not** close the Milestone 5 “larger corpora /
  sidecar gates” item — incremental oracle growth only.

- **2026-04-25 — D87** **Composer template `MAX(id)` aggregate route (`/chrysalis-max-id`).**
  Adds **`max_id_show.php`**: **`SELECT MAX(id) AS x FROM items`** via **`query_one`**, returning
  **`{"maxId":3}`** on the seeded **`items`** table. Manifest, Laravel stub routes, **`verify-flagship-laravel-full`**
  (two **`GET`** captures), ingest + dual-emit parity tests, and README counts move to **nineteen**
  template handlers. Same “incremental corpus only” scope as **D86**.

- **2026-04-25 — D88** **Composer template `ROUND(AVG(id))` aggregate route (`/chrysalis-avg-id`).**
  Adds **`avg_id_show.php`**: **`SELECT ROUND(AVG(id)) AS a FROM items`** via **`query_one`**, returning
  **`{"avgId":2}`** on the seeded ids **1..3** table. Manifest, Laravel stub routes, **`verify-flagship-laravel-full`**
  (two **`GET`** captures), ingest + dual-emit parity tests, and README counts move to **twenty** template handlers.
  Same incremental oracle scope as **D86–D87**.

- **2026-04-25 — D89** **Composer template id-span aggregate route (`/chrysalis-id-span`).**
  Adds **`id_span_show.php`**: **`SELECT (MAX(id) - MIN(id)) AS s FROM items`** via **`query_one`**, returning
  **`{"idSpan":2}`** on the seeded ids **1..3** table. Manifest, Laravel stub routes, **`verify-flagship-laravel-full`**
  (two **`GET`** captures), ingest + dual-emit parity tests, and README counts move to **twenty-one** template handlers.
  Same incremental oracle scope as **D86–D88**.

- **2026-04-25 — D90** **Composer template sum-squares aggregate route (`/chrysalis-sum-squares`).**
  Adds **`sum_squares_show.php`**: **`SELECT SUM(id * id) AS ss FROM items`** via **`query_one`**, returning
  **`{"sumSquares":14}`** on the seeded ids **1..3** table. Manifest, Laravel stub routes, **`verify-flagship-laravel-full`**
  (two **`GET`** captures), ingest + dual-emit parity tests, and README counts move to **twenty-two** template handlers.
  Same incremental oracle scope as **D86–D89**.

- **2026-04-25 — D91** **Composer template filtered-count route (`/chrysalis-even-count`).**
  Adds **`even_count_show.php`**: **`SELECT COUNT(*) AS c FROM items WHERE (id % 2) = 0`** via **`query_one`**,
  returning **`{"evenCount":1}`** on the seeded ids **1..3** table. Manifest, Laravel stub routes,
  **`verify-flagship-laravel-full`** (two **`GET`** captures), ingest + dual-emit parity tests, and README
  counts move to **twenty-three** template handlers. Same incremental oracle scope as **D86–D90**.

- **2026-04-25 — D92** **Composer template odd-count route (`/chrysalis-odd-count`).**
  Adds **`odd_count_show.php`**: **`SELECT COUNT(*) AS c FROM items WHERE (id % 2) = 1`** via **`query_one`**,
  returning **`{"oddCount":2}`** on the seeded ids **1..3** table. Manifest, Laravel stub routes,
  **`verify-flagship-laravel-full`** (two **`GET`** captures), ingest + dual-emit parity tests, and README
  counts move to **twenty-four** template handlers. Same incremental oracle scope as **D86–D91**.

- **2026-04-25 — D93** **Composer template greater-than filter count (`/chrysalis-gt-two-count`).**
  Adds **`gt_two_count_show.php`**: **`SELECT COUNT(*) AS c FROM items WHERE id > 2`** via **`query_one`**,
  returning **`{"gtTwoCount":1}`** on the seeded ids **1..3** table. Manifest, Laravel stub routes,
  **`verify-flagship-laravel-full`** (two **`GET`** captures), ingest + dual-emit parity tests, and README
  counts move to **twenty-five** template handlers. Same incremental oracle scope as **D86–D92**.

- **2026-04-25 — D94** **Composer template less-than filter count (`/chrysalis-lt-three-count`).**
  Adds **`lt_three_count_show.php`**: **`SELECT COUNT(*) AS c FROM items WHERE id < 3`** via **`query_one`**,
  returning **`{"ltThreeCount":2}`** on the seeded ids **1..3** table. Manifest, Laravel stub routes,
  **`verify-flagship-laravel-full`** (two **`GET`** captures), ingest + dual-emit parity tests, and README
  counts move to **twenty-six** template handlers. Same incremental oracle scope as **D86–D93**.

- **2026-04-25 — D95** **Composer template greater-equal filter count (`/chrysalis-gte-two-count`).**
  Adds **`gte_two_count_show.php`**: **`SELECT COUNT(*) AS c FROM items WHERE id >= 2`** via **`query_one`**,
  returning **`{"gteTwoCount":2}`** on the seeded ids **1..3** table. Manifest, Laravel stub routes,
  **`verify-flagship-laravel-full`** (two **`GET`** captures), ingest + dual-emit parity tests, and README
  counts move to **twenty-seven** template handlers. Same incremental oracle scope as **D86–D94**.

- **2026-04-25 — D96** **Composer template less-equal filter count (`/chrysalis-lte-three-count`).**
  Adds **`lte_three_count_show.php`**: **`SELECT COUNT(*) AS c FROM items WHERE id <= 3`** via **`query_one`**,
  returning **`{"lteThreeCount":3}`** on the seeded ids **1..3** table. Manifest, Laravel stub routes,
  **`verify-flagship-laravel-full`** (two **`GET`** captures), ingest + dual-emit parity tests, and README
  counts move to **twenty-eight** template handlers. Same incremental oracle scope as **D86–D95**.

- **2026-04-25 — D97** **Composer template not-equal filter count (`/chrysalis-ne-two-count`).**
  Adds **`ne_two_count_show.php`**: **`SELECT COUNT(*) AS c FROM items WHERE id <> 2`** via **`query_one`**,
  returning **`{"neTwoCount":2}`** on the seeded ids **1..3** table. Manifest, Laravel stub routes,
  **`verify-flagship-laravel-full`** (two **`GET`** captures), ingest + dual-emit parity tests, and README
  counts move to **twenty-nine** template handlers. Same incremental oracle scope as **D86–D96**.

- **2026-04-25 — D98** **Composer template BETWEEN filter count (`/chrysalis-between-count`).**
  Adds **`between_count_show.php`**: **`SELECT COUNT(*) AS c FROM items WHERE id BETWEEN 2 AND 3`** via **`query_one`**,
  returning **`{"betweenCount":2}`** on the seeded ids **1..3** table. Manifest, Laravel stub routes,
  **`verify-flagship-laravel-full`** (two **`GET`** captures), ingest + dual-emit parity tests, and README
  counts move to **thirty** template handlers. Same incremental oracle scope as **D86–D97**.

- **2026-04-25 — D99** **Composer template equals filter count (`/chrysalis-eq-one-count`).**
  Adds **`eq_one_count_show.php`**: **`SELECT COUNT(*) AS c FROM items WHERE id = 1`** via **`query_one`**,
  returning **`{"eqOneCount":1}`** on the seeded ids **1..3** table. Manifest, Laravel stub routes,
  **`verify-flagship-laravel-full`** (two **`GET`** captures), ingest + dual-emit parity tests, and README
  counts move to **thirty-one** template handlers. Same incremental oracle scope as **D86–D98**.

- **2026-04-25 — D100** **Composer template equals filter count (`/chrysalis-eq-three-count`).**
  Adds **`eq_three_count_show.php`**: **`SELECT COUNT(*) AS c FROM items WHERE id = 3`** via **`query_one`**,
  returning **`{"eqThreeCount":1}`** on the seeded ids **1..3** table. Manifest, Laravel stub routes,
  **`verify-flagship-laravel-full`** (two **`GET`** captures), ingest + dual-emit parity tests, and README
  counts move to **thirty-two** template handlers. Same incremental oracle scope as **D86–D99**.

- **2026-04-25 — D101** **Composer template equals filter count (`/chrysalis-eq-two-count`).**
  Adds **`eq_two_count_show.php`**: **`SELECT COUNT(*) AS c FROM items WHERE id = 2`** via **`query_one`**,
  returning **`{"eqTwoCount":1}`** on the seeded ids **1..3** table. Manifest, Laravel stub routes,
  **`verify-flagship-laravel-full`** (two **`GET`** captures), ingest + dual-emit parity tests, and README
  counts move to **thirty-three** template handlers. Same incremental oracle scope as **D86–D100**.

- **2026-04-25 — D102** **Composer template not-equal filter count (`/chrysalis-ne-one-count`).**
  Adds **`ne_one_count_show.php`**: **`SELECT COUNT(*) AS c FROM items WHERE id <> 1`** via **`query_one`**,
  returning **`{"neOneCount":2}`** on the seeded ids **1..3** table. Manifest, Laravel stub routes,
  **`verify-flagship-laravel-full`** (two **`GET`** captures), ingest + dual-emit parity tests, and README
  counts move to **thirty-four** template handlers. Same incremental oracle scope as **D86–D101**.

- **2026-04-25 — D103** **Composer template not-equal filter count (`/chrysalis-ne-three-count`).**
  Adds **`ne_three_count_show.php`**: **`SELECT COUNT(*) AS c FROM items WHERE id <> 3`** via **`query_one`**,
  returning **`{"neThreeCount":2}`** on the seeded ids **1..3** table. Manifest, Laravel stub routes,
  **`verify-flagship-laravel-full`** (two **`GET`** captures), ingest + dual-emit parity tests, and README
  counts move to **thirty-five** template handlers. Same incremental oracle scope as **D86–D102**.

- **2026-04-25 — D104** **Composer template less-than filter count (`/chrysalis-lt-two-count`).**
  Adds **`lt_two_count_show.php`**: **`SELECT COUNT(*) AS c FROM items WHERE id < 2`** via **`query_one`**,
  returning **`{"ltTwoCount":1}`** on the seeded ids **1..3** table. Manifest, Laravel stub routes,
  **`verify-flagship-laravel-full`** (two **`GET`** captures), ingest + dual-emit parity tests, and README
  counts move to **thirty-six** template handlers. Same incremental oracle scope as **D86–D103**.

- **2026-04-25 — D105** **Composer template greater-than filter count (`/chrysalis-gt-one-count`).**
  Adds **`gt_one_count_show.php`**: **`SELECT COUNT(*) AS c FROM items WHERE id > 1`** via **`query_one`**,
  returning **`{"gtOneCount":2}`** on the seeded ids **1..3** table. Manifest, Laravel stub routes,
  **`verify-flagship-laravel-full`** (two **`GET`** captures), ingest + dual-emit parity tests, and README
  counts move to **thirty-seven** template handlers. Same incremental oracle scope as **D86–D104**.

- **2026-04-25 — D106** **Composer template greater-or-equal filter count (`/chrysalis-gte-one-count`).**
  Adds **`gte_one_count_show.php`**: **`SELECT COUNT(*) AS c FROM items WHERE id >= 1`** via **`query_one`**,
  returning **`{"gteOneCount":3}`** on the seeded ids **1..3** table. Manifest, Laravel stub routes,
  **`verify-flagship-laravel-full`** (two **`GET`** captures), ingest + dual-emit parity tests, and README
  counts move to **thirty-eight** template handlers. Same incremental oracle scope as **D86–D105**.

- **2026-04-25 — D107** **Composer template less-or-equal filter count (`/chrysalis-lte-one-count`).**
  Adds **`lte_one_count_show.php`**: **`SELECT COUNT(*) AS c FROM items WHERE id <= 1`** via **`query_one`**,
  returning **`{"lteOneCount":1}`** on the seeded ids **1..3** table. Manifest, Laravel stub routes,
  **`verify-flagship-laravel-full`** (two **`GET`** captures), ingest + dual-emit parity tests, and README
  counts move to **thirty-nine** template handlers. Same incremental oracle scope as **D86–D106**.

- **2026-04-25 — D108** **Composer template bounded filter count (`/chrysalis-between-one-two-count`).**
  Adds **`between_one_two_count_show.php`**: **`SELECT COUNT(*) AS c FROM items WHERE id BETWEEN 1 AND 2`**
  via **`query_one`**, returning **`{"betweenOneTwoCount":2}`** on the seeded ids **1..3** table.
  Manifest, Laravel stub routes, **`verify-flagship-laravel-full`** (two **`GET`** captures), ingest +
  dual-emit parity tests, and README counts move to **forty** template handlers. Same incremental
  oracle scope as **D86–D107**.

- **2026-04-25 — D109** **Composer template greater-than filter count (`/chrysalis-gt-three-count`).**
  Adds **`gt_three_count_show.php`**: **`SELECT COUNT(*) AS c FROM items WHERE id > 3`** via **`query_one`**,
  returning **`{"gtThreeCount":0}`** on the seeded ids **1..3** table. Manifest, Laravel stub routes,
  **`verify-flagship-laravel-full`** (two **`GET`** captures), ingest + dual-emit parity tests, and README
  counts move to **forty-one** template handlers. Same incremental oracle scope as **D86–D108**.

- **2026-04-25 — D110** **Composer template strict-lower-bound filter count (`/chrysalis-lt-one-count`).**
  Adds **`lt_one_count_show.php`**: **`SELECT COUNT(*) AS c FROM items WHERE id < 1`** via **`query_one`**,
  returning **`{"ltOneCount":0}`** on the seeded ids **1..3** table. Manifest, Laravel stub routes,
  **`verify-flagship-laravel-full`** (two **`GET`** captures), ingest + dual-emit parity tests, and README
  counts move to **forty-two** template handlers. Same incremental oracle scope as **D86–D109**.

- **2026-04-25 — D111** **Composer template inclusive-upper-bound filter count (`/chrysalis-gte-three-count`).**
  Adds **`gte_three_count_show.php`**: **`SELECT COUNT(*) AS c FROM items WHERE id >= 3`** via **`query_one`**,
  returning **`{"gteThreeCount":1}`** on the seeded ids **1..3** table. Manifest, Laravel stub routes,
  **`verify-flagship-laravel-full`** (two **`GET`** captures), ingest + dual-emit parity tests, and README
  counts move to **forty-three** template handlers. Same incremental oracle scope as **D86–D110**.

- **2026-04-25 — D112** **Composer template inclusive-two filter count (`/chrysalis-lte-two-count`).**
  Adds **`lte_two_count_show.php`**: **`SELECT COUNT(*) AS c FROM items WHERE id <= 2`** via **`query_one`**,
  returning **`{"lteTwoCount":2}`** on the seeded ids **1..3** table. Manifest, Laravel stub routes,
  **`verify-flagship-laravel-full`** (two **`GET`** captures), ingest + dual-emit parity tests, and README
  counts move to **forty-four** template handlers. Same incremental oracle scope as **D86–D111**.

- **2026-04-25 — D113** **Composer template zero-equality filter count (`/chrysalis-eq-zero-count`).**
  Adds **`eq_zero_count_show.php`**: **`SELECT COUNT(*) AS c FROM items WHERE id = 0`** via **`query_one`**,
  returning **`{"eqZeroCount":0}`** on the seeded ids **1..3** table. Manifest, Laravel stub routes,
  **`verify-flagship-laravel-full`** (two **`GET`** captures), ingest + dual-emit parity tests, and README
  counts move to **forty-five** template handlers. Same incremental oracle scope as **D86–D112**.

- **2026-04-25 — D114** **Composer template zero-inequality filter count (`/chrysalis-ne-zero-count`).**
  Adds **`ne_zero_count_show.php`**: **`SELECT COUNT(*) AS c FROM items WHERE id <> 0`** via **`query_one`**,
  returning **`{"neZeroCount":3}`** on the seeded ids **1..3** table. Manifest, Laravel stub routes,
  **`verify-flagship-laravel-full`** (two **`GET`** captures), ingest + dual-emit parity tests, and README
  counts move to **forty-six** template handlers. Same incremental oracle scope as **D86–D113**.

- **2026-04-25 — D115** **Composer complexity ladder pack (realistic → unrealistic).**
  Adds **`items_snapshot_show.php`**, **`items_group_parity_show.php`**, **`items_cte_rollup_show.php`**,
  and **`recursive_stress_show.php`** with deterministic outputs on seeded ids **1..3**:
  **`/chrysalis-items-snapshot`** (`COUNT/MIN/MAX/SUM` in one row),
  **`/chrysalis-items-group-parity`** (`GROUP BY id % 2` parity buckets),
  **`/chrysalis-items-cte-rollup`** (`WITH`-CTE rollup), and
  **`/chrysalis-recursive-stress`** (recursive CTE stress shape intended as near-unrealistic upper bound).
  Manifest, Laravel stub routes, **`verify-flagship-laravel-full`** (two **`GET`** captures each),
  ingest + dual-emit parity tests, and README counts move to **fifty** template handlers.
  Same incremental oracle scope as **D86–D114**, now explicitly broadening SQL-shape diversity.

- **2026-04-25 — D116** **Verify harness stress + semantic assertions (`verify:laravel-full`).**
  Extends **`scripts/verify-flagship-laravel-full.mjs`** with multi-run stress replay
  (`--stress-runs=N` / `CHRYSALIS_VERIFY_STRESS_RUNS`) and deterministic fingerprint
  drift checks per backend. Adds corpus semantic assertions for high-complexity routes:
  **`/chrysalis-items-snapshot`**, **`/chrysalis-items-group-parity`**,
  **`/chrysalis-items-cte-rollup`**, and **`/chrysalis-recursive-stress`**.
  Also adds **`pnpm run verify:laravel-full:stress`** and README callouts.

- **2026-04-26 — D117** **Seed-variant replay matrix for `verify:laravel-full`.**
  Extends **`scripts/verify-flagship-laravel-full.mjs`** with seed controls:
  **`--seed-variant=baseline|empty|ten`** (or **`CHRYSALIS_VERIFY_SEED_VARIANT`**) and
  **`--seed-variants=...`** (or **`CHRYSALIS_VERIFY_SEED_VARIANTS`**) for sequential matrix replay.
  Fixture capture DB and emitted backend DB now share the same seed-specific schema rewrite,
  preserving oracle parity while exercising edge cardinalities (`0`, `3`, `10` rows).
  Semantic assertions for **`/chrysalis-items-snapshot`**,
  **`/chrysalis-items-group-parity`**, **`/chrysalis-items-cte-rollup`**, and
  **`/chrysalis-recursive-stress`** are now seed-aware. Adds
  **`pnpm run verify:laravel-full:seed-matrix`** and README/ROADMAP callouts.

- **2026-04-26 — D118** **Five-nines confidence gate for `laravel-full` verify.**
  Extends **`scripts/verify-flagship-laravel-full.mjs`** with explicit negative-path
  semantics (`GET /chrysalis-session/login` method guard and bad-login body),
  metamorphic cross-route invariants (snapshot/parity/CTE/recursive relations),
  and confidence artifact emission at
  **`reports/confidence/flagship-laravel-full.json`** (per backend correctness/drift).
  Adds **`pnpm run verify:laravel-full:5nines`**, extends **`scripts/ci-gates.mjs`**
  with `confidence-5nines`, and upgrades CI to run + artifact this gate.

- **2026-04-26 — D119** **Risk-cell dashboard in five-nines confidence artifact.**
  Extends **`reports/confidence/flagship-laravel-full.json`** shape with `riskCells`
  coverage rows (health/metadata, redirects, session happy+negative paths, SQL
  aggregates/CTE, seed variance, replay determinism, dual-emitter parity).
  Extends `confidence-5nines` CI gate to require all risk cells and require each
  cell to remain `covered`, making confidence artifacts directly actionable.

- **2026-04-26 — D120** **Per-cell KPI thresholds in five-nines dashboard.**
  Extends each confidence `riskCells[]` row with numeric `kpi` payload
  (`value`, `min`, `unit`) computed from the captured corpus and replay settings.
  Adds KPI gate enforcement in `confidence-5nines` so confidence fails when a
  cell regresses beneath threshold, turning the artifact into a trendable,
  machine-enforced confidence dashboard.

- **2026-04-26 — D121** **Rolling confidence trend gate + stricter five-nines CI lane.**
  Extends **`scripts/verify-flagship-laravel-full.mjs`** to append per-run entries into
  **`reports/confidence/history/flagship-laravel-full.history.json`** and broadens
  negative-path semantics (`GET /chrysalis-session/logout` method guard, empty-login, empty-echo).
  Extends **`scripts/ci-gates.mjs`** with `confidence-trend` (rolling streak check) and
  updates **`verify:laravel-full:5nines`** to require both `confidence-5nines` and
  `confidence-trend`. CI now restores/saves confidence history cache and runs the
  laravel-full lane at **`VERIFY_THRESHOLD=0.99999`**.

- **2026-04-26 — D122** **Resolve flagship scope boundaries (laravel-min, Breeze, auth ownership).**
  Chooses to keep **`flagship/laravel-min`** as the permanent **shaped fast fixture**
  with its own verify harness (not folded into `laravel-full`). Chooses to keep
  **Breeze first-party auth UI** outside manifest parity scope until a dedicated
  milestone explicitly onboards those routes. Chooses to keep production-shaped
  auth internals (rotating CSRF, gateways, MFA/OAuth) outside owned parity scope
  for current milestones and represent them via explicit holes/residual-legacy
  reporting until that milestone is opened.

- **2026-04-26 — D123** **CI auto-switch for confidence trend strictness.**
  Adds `confidence-trend-ready` to **`scripts/ci-gates.mjs`** so CI can detect when
  enough history exists to enforce strict rolling trend gates. The
  `verify flagship (laravel-full scaffold)` workflow now sets
  `CONFIDENCE_TREND_ALLOW_WARMUP` dynamically: warmup while history is short,
  strict mode once history reaches `CONFIDENCE_STREAK_REQUIRED`.

- **2026-04-26 — D124** **Request-shape robustness checks in five-nines gate.**
  Extends laravel-full verify corpus with JSON content-type mismatch probes for
  form-only handlers (`POST /chrysalis-session/login`, `POST /chrysalis-echo`) and
  method-guard probe for `GET /chrysalis-echo`. Adds corresponding semantic
  assertions and introduces a dedicated confidence risk cell
  `request-shape-robustness` enforced by `confidence-5nines`.

- **2026-04-26 — D125** **Session idempotency checks in five-nines gate.**
  Extends laravel-full verify corpus to invoke `POST /chrysalis-session/logout`
  twice and asserts stable success semantics (`{"ok":true}` remains available
  across repeated logout traces). Adds dedicated confidence risk cell
  `session-idempotency` with KPI thresholding under `confidence-5nines`.

- **2026-04-26 — D126** **Session transition monotonicity checks in five-nines gate.**
  Extends laravel-full verify corpus with relogin branch and additional
  `GET /chrysalis-session/me` observation. Adds explicit transition assertion
  that session state follows `null -> flagship -> null -> flagship` in order.
  Adds dedicated confidence risk cell `session-transition-monotonicity` with
  KPI thresholds enforced by `confidence-5nines`.

- **2026-04-26 — D127** **Header contract strictness + redirect location invariants.**
  Extends semantic assertions for laravel-full verify to enforce content-type
  contracts on text/json routes (`/chrysalis-health.txt`, `/api/chrysalis-health`,
  `/chrysalis-items-snapshot`, `/chrysalis-session/me`) and location header
  invariant on `/chrysalis-jump`. Adds confidence risk cells
  `header-contract-strictness` and `redirect-location-invariants` enforced by
  `confidence-5nines`.

- **2026-04-26 — D128** **Cookie/session header invariants in five-nines gate.**
  Extends laravel-full semantic assertions to require `set-cookie` with
  `chrysalis_sid=` on session transition routes (`POST /chrysalis-session/login`,
  `POST /chrysalis-session/logout`, `GET /chrysalis-session/me`). Adds confidence
  risk cell `cookie-session-header-invariants` with KPI thresholds enforced by
  `confidence-5nines`.

- **2026-04-26 — D129** **Cross-emitter verify report parity in five-nines gate.**
  After Hono and Fastify replays, compares a **stable** `buildReport` fingerprint
  (aggregate + per-endpoint scores; excludes `generatedAt`) for run 1 of each
  backend. Mismatch fails the verify run and the confidence risk cell
  `cross-backend-verify-parity`. Stress-run drift also uses the stable fingerprint
  so multi-run stress mode measures real verify drift, not timestamp noise.

- **2026-04-26 — D130** **Trend history tracks cross-backend parity health.**
  `appendConfidenceHistory` now persists `crossBackendParityOk` from each five-
  nines run so rolling confidence trend entries retain explicit emitter parity
  state. `confidence-trend` treats `crossBackendParityOk: false` as a regression
  (while remaining backward-compatible with older entries that omit the field).

- **2026-04-26 — D131** **Seed matrix confidence + chimera test robustness.**
  Multi-seed `verify:laravel-full:5nines` parent artifact adds
  `matrixCrossBackendParityOk` (true when every non-skipped variant has
  `crossBackendParity.ok !== false`). `runtime-chimera` proxy integration tests
  retry the first `fetch` to the chimera port to absorb occasional Windows
  `bad port` / `fetch failed` races after `listen`.

- **2026-04-26 — D132** **Pipeline-owned idiomaticity/residual sidecars (flagship full).**
  `verify-flagship-laravel-full.mjs` writes **`reports/migration/flagship-laravel-full-emit-stats.json`**
  (manifest route count + per-emitter hole/handler counts). **`status-flagship-laravel-full.mjs`**
  then writes **`reports/migration/idiomaticity.json`** (`pct` from emitted-handler
  `@chrysalis/compat` scan, dual-emitter conservative `min`) and
  **`reports/migration/residual-legacy.json`** (`legacyRequestPct` from emit-hole
  density vs manifest routes; documented as distinct from chimera production
  traffic). **`confidence-5nines`** requires **`matrixCrossBackendParityOk: true`**
  on seed-matrix parent artifacts; **`confidence-trend`** rejects
  **`matrixCrossBackendParityOk: false`** when present on history rows; matrix
  verify children set **`CHRYSALIS_VERIFY_MATRIX_ACTIVE=1`** so history rows carry
  **`matrixActive` / `matrixCrossBackendParityOk`**. Logic lives in
  **`scripts/flagship-migration-metrics.mjs`** (no `webir`/`emit` imports).

- **2026-04-26 — D133** **Laravel-min parity for emit-stats + migration sidecars.**
  `verify-flagship-laravel-min.mjs` writes **`flagship-laravel-min-emit-stats.json`**.
  New **`pnpm run status:laravel-min`** (`scripts/status-flagship-laravel-min.mjs`)
  runs the same **`status-migration`** gate as CI, persists **`flagship-laravel-min.json`**,
  and calls **`writeFlagshipLaravelMinMigrationSidecars`** (shared metrics module with
  **`pilot`** field on sidecars). CI uploads emit-stats + sidecars for both flagship
  jobs; **`writeMigrationSidecars`** parameterizes emit-stats path + generated handler
  roots.

- **2026-04-26 — D134** **Optional CI floors for migration sidecars.**
  Adds **`ci-gates.mjs migration-sidecar-floors [reports/migration]`** driven by
  **`CHRYSALIS_IDIOMATICITY_MIN`** (0..1, requires **`idiomaticity.json`**) and/or
  **`CHRYSALIS_RESIDUAL_LEGACY_MAX`** (0..100, requires **`residual-legacy.json`**).
  If neither env var is set, the gate skips. CI flagship jobs run the gate after
  **`status:laravel-*`** with conservative defaults (**`0.01`** / **`50`**) to catch
  regressions without over-fitting current emit noise.

- **2026-04-26 — D135** **Flagship full verify: wider `chrysalis-hello` oracle shapes.**
  **`verify-flagship-laravel-full.mjs`** captures **`GET /chrysalis-hello`** with no query
  (default **`world`** trim path), **`?name=`** (empty trimmed segment), the existing
  **`flagship` / `composer`** pair, and **`name=x%20y`** (decoded space). Semantic
  assertions pin each distinct plaintext body on the grouped route **`GET /chrysalis-hello`**.

- **2026-04-26 — D136** **`laravel-min` verify: wider `/hello` oracle + post-capture assertions.**
  **`verify-flagship-laravel-min.mjs`** captures **`GET /hello`** with no query (default
  **`guest`**), **`?name=`**, the existing **`flagship-corpus` / `chrysalis`** pair, and
  **`name=x%20y`**. Immediately after **`readCorpus`**, asserts each expected **`hello:`…**
  body appears on the grouped route **`GET /hello`** (same path-keying as D135).

- **2026-04-26 — D137** **`laravel-min` verify corpus semantics beyond `/hello`.**
  Expands post-capture assertions in **`verify-flagship-laravel-min.mjs`** to pin
  **`GET /health`** body, **`GET /api/health`** JSON body, **`GET /jump`** status/location,
  **`GET /session/me`** anon/auth states, and redirect status for **`POST /login`** /
  **`POST /logout`**. This keeps fixture drift visible before dual-emitter replay.

- **2026-04-26 — D138** **`laravel-min` metadata/static route contracts in verify.**
  Further expands **`verify-flagship-laravel-min.mjs`** post-capture assertions to pin
  exact body + content-type for **`/robots.txt`**, **`/humans.txt`**,
  **`/.well-known/security.txt`**, **`/sitemap.xml`**, **`/css/pilot.css`**, and
  **`/manifest.webmanifest`**. This hardens deterministic fixture surfaces that often
  regress from incidental formatting/header changes.

- **2026-04-26 — D139** **`laravel-min` cross-backend verify parity gate.**
  **`verify-flagship-laravel-min.mjs`** now computes a stable fingerprint over
  verify report `aggregate` + `endpoints` per backend and fails when Hono/Fastify
  diverge. This mirrors the parity invariant already enforced in the flagship-full
  confidence harness, but scoped to the fast `laravel-min` fixture lane.

- **2026-04-26 — D140** **`laravel-min` echo request-shape + method-guard semantics.**
  **`verify-flagship-laravel-min.mjs`** now captures and asserts negative echo shapes:
  empty form POST and JSON POST return **400** with **`msg required`**, while
  **`GET /echo`** remains a **404** method/route guard (`Not Found`). Existing
  successful form echoes remain pinned (`echo:flagship-verify`, `echo:second-post`).

- **2026-04-26 — D141** **`laravel-min` home + DB list/count + visit + login form contracts.**
  Extends **`assertLaravelMinCorpusSemantics`** to pin **`GET /`** HTML fragment,
  **`GET /items`** / **`GET /count`** against the seeded **`items`** table, monotonic
  **`GET /session/visit`** bodies **`visits:1`** / **`visits:2`**, and minimal **`GET /login`**
  HTML markers plus **`text/html`** — all on the existing capture (no extra HTTP
  driver requests).

- **2026-04-26 — D142** **`laravel-min` bad-CSRF `POST /login` + mixed-status assertions.**
  Oracle driver issues **`POST /login`** with a wrong **`csrf`** token after
  **`GET /login`**, expected **403** + **`csrf rejected`**. Post-capture semantics
  use **`assertRouteContainsStatus`** so **`POST /login`** can include both **403** and
  **302** traces without weakening the happy-path redirect pin.

- **2026-04-26 — D143** **`laravel-min` login credential negative traces.**
  Adds oracle **`POST /login`** with valid CSRF but wrong password (**401** +
  **`invalid credentials`**) and with only **CSRF** (empty user/pass → **400** +
  **`credentials required`**). Post-capture semantics assert all four status/body
  variants alongside the happy-path **302** redirect.

- **2026-04-26 — D144** **`laravel-min` `GET /logout` method guard (404).**
  Oracle driver records **`GET /logout`** against the fixture front controller; only
  **`POST /logout`** is wired, so the response is **404** **`Not Found`** (same
  default as **`GET /echo`**). Post-capture semantics pin **`GET /logout`** status/body.

- **2026-04-26 — D145** **`laravel-min` `POST /session/me` method guard (404).**
  Oracle driver records wrong-method **`POST /session/me`**; the fixture front
  controller wires **`GET /session/me`** only, so default handling remains
  **404** **`Not Found`**. Post-capture semantics pin status/body for this route.

- **2026-04-26 — D146** **`laravel-min` `POST /session/visit` method guard (404).**
  Oracle driver records wrong-method **`POST /session/visit`**; the fixture front
  controller wires **`GET /session/visit`** only, so default handling remains
  **404** **`Not Found`**. Post-capture semantics pin status/body for this route.

- **2026-04-26 — D147** **`laravel-min` `POST /count` method guard (404).**
  Oracle driver records wrong-method **`POST /count`**; the fixture front controller
  wires **`GET /count`** only, so default handling remains **404** **`Not Found`**.
  Post-capture semantics pin status/body for this route.

- **2026-04-26 — D148-D160** **`laravel-min` method-guard expansion pack (404).**
  Oracle driver now records additional wrong-method calls and post-capture semantics
  pin each to **404** **`Not Found`**: **`POST /items`**, **`POST /health`**,
  **`POST /api/health`**, **`POST /jump`**, **`POST /hello`**, **`POST /`**,
  **`POST /robots.txt`**, **`POST /humans.txt`**, **`POST /.well-known/security.txt`**,
  **`POST /sitemap.xml`**, **`POST /css/pilot.css`**, **`POST /manifest.webmanifest`**,
  and **`PUT /login`** (since only GET/POST are wired for `/login`).

- **2026-04-26 — D161** **Milestone 5 checklist closure.**
  `ROADMAP.md` marks Milestone 5 as complete and closes the remaining checklist
  item (larger corpora / pipeline-owned migration sidecars), reflecting delivered
  D84-D160 work in canonical scaffold/verify/status pipelines plus expanded
  `laravel-min` oracle and semantics coverage.

- **2026-04-26 — D162** **Milestone 6 roadmap shell (deferred backlog tracked).**
  `ROADMAP.md` opens **Milestone 6 — Depth follow-ons** in planning state and
  converts deferred/optional backlog into explicit checklist items (vendor-effect
  depth, effect narrowing, `mysqli` oracle path, production session infra track,
  migration sidecar release policy, and auth-boundary milestone carve-out).

- **2026-04-26 — D164** **Effect narrowing for `call_user_func*` overlays.**
  `effectsReachableWithCallOverlay` now narrows dynamic-helper widening when the
  first argument is a literal string callee found in the overlay map; truly
  dynamic callees keep the prior all-callees widening behavior.

- **2026-04-26 — D165** **Oracle PHP `mysqli` query-path capture (initial slice).**
  Adds `Chrysalis\Oracle\Db\MySQLi` as a drop-in subclass that records
  `query()` SQL events (driver/sql/rowCount/shape/duration/origin) and wires it
  into bootstrap loading + package docs. Prepared-statement / row-payload parity
  remains a follow-on.


