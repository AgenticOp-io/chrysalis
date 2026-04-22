# Chrysalis — Design Document

> **This document is the north star. If something you are about to build contradicts
> this document, stop and either (a) change this document with justification, or
> (b) change your plan. Do not silently drift.**

Status: **v0.1 — foundational**
Last updated by: initial scaffold

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
