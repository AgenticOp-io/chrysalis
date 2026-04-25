# Chrysalis — Roadmap

> Read `DESIGN.md` first. This file is the execution plan for that design.

Milestones are intentionally thin vertical slices. Each milestone must produce a
runnable demo and measurable numbers, not a pile of abstractions.

**Active milestone: Milestone 4 — First real app.** Milestones 0–3 are complete.
Milestone 2 follow-ups that remain intentionally open-ended (Composer vendor
effects, `mysqli` oracle shim, bare inner N+1 without assign, corpus-only batch
confidence) stay cross-cutting; repair-loop follow-ons (richer attribution,
composite proposers) are optional and must not weaken the verify gate.

---

## Milestone 0 — Foundations (days, not weeks)

**Goal:** repo exists, architecture is committed, nothing is hand-wavy.

- [x] `DESIGN.md`, `ROADMAP.md`, `AGENTS.md`, `README.md` land
- [x] pnpm monorepo scaffolded with all 10 package folders
- [x] Each package has a `README.md` stating its single responsibility
- [x] `fixtures/tiny-blog/` exists with 5 PHP endpoints and a minimal schema
- [x] CI (GitHub Actions) typechecks every package
- [x] `chrysalis --help` prints subcommands (even as stubs)

**Done when:** a contributor can clone, install, and run `chrysalis --help`.
**Status: complete.**

---

## Milestone 1 — Vertical slice (2–3 weeks)

**Goal:** end-to-end on `fixtures/tiny-blog`. Prove the whole thesis once.

**Status: Milestone 1 is complete end-to-end. Translation axis (2, 3, 5, 8),
Oracle recording (1), Verify HTTP-replay + correctness scoring (6),
Archaeology DDL + corpus → typed domain models (4), runtime chimera with
legacy/cutover/shadow modes (7), and the `chrysalis status` dashboard are
all implemented against the tiny-blog fixture. Follow-ups once shipped as
vertical slice: recorded-SQL replay, heuristic IR divergence attribution,
Drizzle migration, and session bridging landed in Milestones 2–3 (see items
below).**
The unmodified tiny-blog PHP app is ingested into a 325-node WebIR module
with zero holes; emit-hono produces a compiling TypeScript project that
serves live HTTP requests against a seeded SQLite database. The Oracle PHP
prelude captures HTTP + SQL + session traces into a versioned NDJSON
corpus; `chrysalis observe` wires it up; `chrysalis corpus` summarizes it;
`chrysalis verify` replays the corpus against the emitted app and produces
a per-route correctness report.

Acceptance — every item must be demonstrable on the tiny-blog fixture:

1. **Oracle (record)**
   - [x] `chrysalis observe` runs the PHP built-in server with the Oracle
         prelude loaded via `auto_prepend_file` (D6)
   - [x] Captures request/response pairs for all 5 endpoints (incl. session
         state pre- and post-handler)
   - [x] Captures SQL queries + result sets via a PDO driver shim
         (`\Chrysalis\Oracle\Db\PDO`)
   - [x] Persists to a versioned `TraceCorpus` on disk (schema 1.0.0), one
         NDJSON file per request, redacted at capture time (D7)
   - [x] `chrysalis corpus <dir>` summarizes a captured corpus

2. **Parser bridge**
   - [x] Emits canonical PHP AST JSON via the glayzzle provider (D5).
         Nikic provider remains the canonical production path and is TBD.
   - [x] Handles the fixture's full syntax surface without unknown nodes.

3. **Ingest (PHP AST → WebIR)**
   - [x] Produces `web.request`, `effect`, and `data` dialect nodes
   - [x] Every node carries an `origin` locator back to PHP source
   - [x] Unhandled constructs become typed holes, not crashes
         (tiny-blog currently yields **zero** holes)

4. **Archaeology**
   - [x] Reads the DB schema from the fixture's SQLite/MySQL DDL
         (parser in `packages/archaeology/src/parse-schema.ts`)
   - [x] Intersects with observed JSON shapes from the trace corpus
         (groups SQL row shapes by FROM/JOIN-attributed table)
   - [x] Emits `Post`, `User`, `Comment` types with `@chrysalis-provenance`
         JSDoc. Nullable columns become `T | null`; `CHECK (col IN (...))`
         promotes a TEXT column to a string-literal union.
   - [x] `chrysalis archaeology <schema.sql> [--traces <dir>] [--out <file>]`
         CLI; `scripts/run-e2e.mjs` auto-generates
         `generated/tiny-blog/src/domain.ts` and the emitted project still
         typechecks.
   - [x] **(v2)** Heuristic form-field extraction from inline HTML/templates in
         PHP (`@chrysalis/archaeology` `php-form-scan`, `runArchaeology({ phpRoots })`,
         CLI `--php-root`, `chrysalis status` passes `--project` for scans). INSERT/UPDATE
         targets disambiguate shared column names (e.g. `body` on posts vs comments).
   - [x] emit-hono consumes archaeology interface names as `queryOne<T>` /
         `queryAll<T>` when `EmitInput.domainTypesByTable` is supplied and
         the `db.query` node tags a single table (D22). `run-e2e.mjs` and
         `chrysalis emit --schema` write `src/domain.ts` and pass the map.

5. **Emit (Hono + SQLite)**
   - [x] Produces a runnable project (Hono + `node:sqlite`)
   - [x] Routes mirror the PHP URL structure
   - [x] Handlers carry `@chrysalis-effects` annotations derived from WebIR
   - [x] Eligible **string-dispatch** if/elseif chains (one `request.field`
         vs distinct string literals, same matcher as `@chrysalis/insight`)
         emit as a TypeScript `switch` with a normalized discriminant (D21).
   - [x] At least one deliberately-unsupported node appears as a compiling
         hole (none needed for tiny-blog; the infrastructure exists and is
         exercised on synthetic inputs in tests).
   - [x] Drizzle schema + dependency in emitted app when `--schema` /
         `EmitInput.schemaReport` is used (`emitDrizzleSchema`, `src/schema.ts`);
         handler reads/writes still use sync `node:sqlite` prepares (SQL replay).
         Follow-up: optional native driver + Drizzle query builder for reads when
         we accept async or a sync-capable driver.

6. **Verify (replay oracle)**
   - [x] Runs every captured trace against the generated handlers over HTTP,
         with ordered cookie-chaining so a login cookie flows into the next
         request (single-user model for Milestone 1)
   - [x] Diffs status, strict headers (content-type, location), and body per
         trace with Jaccard similarity after normalization (timestamps,
         session-cookie values, UUIDs, whitespace)
   - [x] Produces `reports/verify/summary.json` + one file per route with a
         per-endpoint and aggregate correctness score
   - [x] `chrysalis verify <traces> --base-url <url> [--threshold]` CLI
   - [x] **Recorded SQL results** — traces capture SELECT `rows`; verify sends
         `x-chrysalis-sql-tape`; emit-hono serves `queryOne` / `queryAll` from
         the tape when the header is present (`recordedSqlReplay`, default on
         in `verify-tiny-blog` / CLI unless `--no-recorded-sql`). Mutations
         still hit SQLite. Deterministic time/RNG uses `src/ctx.ts` in emits;
         `verify` replay sends `x-chrysalis-now-iso` / `x-chrysalis-random-seed`
         from trace metadata by default.
   - [x] Heuristic divergence attribution: up to five WebIR `NodeId`s per failed
        trace when `replayCorpus` receives the ingest `module` (`chrysalis verify
        --project`, `chrysalis repair`). Precise bidirectional emit↔IR maps remain
        future work.

7. **Runtime chimera (dual-stack)**
   - [x] A Node-based proxy routes per-path to either PHP or the new stack
   - [x] Supports modes: `legacy`, `shadow`, `cutover`
   - [x] Shadow mode logs diffs in the same format as `verify` (reuses
         `@chrysalis/verify`'s `diffResponse`; NDJSON at `<shadowLogDir>/shadow.ndjson`)
   - [x] `chrysalis deploy --mode=<legacy|cutover|shadow> --legacy <url> --modern <url>`
         CLI (reads optional `--config chimera.json` for routing rules)
   - [x] **Session bridge (file JSON, demo-grade)** — emitted Hono stack
         persists sessions under `CHRYSALIS_SESSION_DIR` as `{sid}.json` with
         cookie name `CHRYSALIS_SESSION_COOKIE` (`chrysalis_sid` default). PHP
         can share the directory + cookie + JSON keys (documented in
         `packages/oracle-php/README.md`). Redis / shared infra remains a
         follow-up for production.

8. **CLI dashboard**
   - [x] `chrysalis ingest <dir>` prints route/node/hole counts and dialect totals
   - [x] `chrysalis emit <dir> --out <dir> [--target=hono]` generates the project
         and reports per-handler effects
   - [x] `chrysalis observe <dir>` starts the live recorder
   - [x] `chrysalis corpus <dir>` summarizes a traces directory
   - [x] `chrysalis verify <traces> --base-url <url>` replays and scores
   - [x] `chrysalis archaeology <schema.sql> --out <file>` emits typed
         domain models (optionally fused with `--traces <dir>`)
   - [x] `chrysalis status` prints (with `--json` for machines):
     - Corpus size (traces + distinct routes, from `--traces`; optional D32
       `http.outbound` / `mail.send` totals when present)
     - Correctness % (aggregate + per-endpoint, from `reports/verify/summary.json`
       or dual-backend `reports/verify/{hono,fastify}/summary.json`)
     - Archaeology coverage (entities, fields, unknown DDL, orphan shapes,
       field conflict count, trace-promoted literal unions; from `--schema`
       and optional `--traces`)
     - Shadow-mode results (mirrored / agreed / diverged from
       `reports/shadow/shadow.ndjson`)
     - Residual legacy: hole count + IR dialect totals (from `--project`)

**Definition of done:** a demo recording that walks from an unmodified PHP
tiny-blog, through `observe → ingest → emit → verify → cutover`, with live
metrics, in under 10 minutes.

**Closure:** Milestone 1 acceptance list is fully checked; this milestone is
**closed**.

---

## Milestone 2 — Expansion (4–6 weeks)

Deepen each layer without broadening too fast.

**Status: complete.** Delivered: second emitter, insight+rewrite stack (incl.
`dispatch-union-zod` for string-dispatch → enum-shaped boundary + param rewire),
`call_user_func*` effect widening in `effectsReachableWithCallOverlay`, nested
`FunctionDecl` bodies in `buildCallEffectMap`, `SELECT *` support in
`batch-n1-read`, dual verify, canary chimera, archaeology/trace enums, CI
goldens. **Explicitly not required for M2 closure:** Composer vendor callees,
effect narrowing, bare inner N+1 without `__assign`, corpus-only batch gating,
and a first-class `mysqli` oracle driver (PDO path remains the supported
default).

- [x] Second emit backend: `emit-fastify` (proves WebIR target-portability;
      shared `@chrysalis/emit-shared` handler lowering; CLI `--target=fastify`)
- [x] **Effect inference (widening v1 + v2):** cross-call effect sets for manifest
      routes + `lib/` + same-file helpers (see below). v2 adds nested function
      bodies in the call map and `call_user_func*` widening (full detail in the
      nested bullet). **Still future:** Composer vendor, arbitrary variable callees,
      effect **narrowing**, whole-program refinement.
  - [x] Handler `effects` union over the body subgraph (`effectsReachableFrom`);
        Hono/Fastify `@chrysalis-effects` and `effectsByHandler` prefer that IR
        list (`handlerEffectAnnotationTags` / `effectTagsSorted`), with emit-time
        collection as fallback for hand-built modules
  - [x] **Library cross-call widening (D30):** `lib/**/*.php` top-level functions
        → fixpoint effect map; `effectsReachableWithCallOverlay` on route bodies
        (`buildCallEffectMap`, `ingestDirectory`)
  - [x] **Same-file route helpers (D31):** top-level `FunctionDecl` in manifest
        route files are hoisted into `buildCallEffectMap` (after `lib/`, no
        override); stripped from handler lowering (`stripTopLevelFunctionDecls`)
  - [x] **Widening v2 (M2):** nested `FunctionDecl` bodies are walked inside
        `lib/**` and route files when building `buildCallEffectMap`. Dynamic
        `call_user_func`, `call_user_func_array`, `forward_static_call`, and
        `forward_static_call_array` union **all** known callee effects from the
        overlay map (sound over-approximation). **Still future:** vendor/Composer
        resolution, variable callee other than the above builtins, effect
        **narrowing**, whole-program refinement.
- [x] **Insight stage (`@chrysalis/insight`)** — pure recognizers over WebIR
      with corpus-backed confidence boost (D13). Five recognizers so far:
      N+1 queries, scattered input validation, string-based dispatch,
      unescaped-output (XSS), raw-sql-concat (SQLi). `chrysalis insight`
      CLI + dashboard integration. See `packages/insight/README.md`.
- [x] **Taint primitive (`@chrysalis/insight/taint`, D14)** — intra-handler
      source→sink reachability with explicit sanitizer allowlist; substrate
      for data-flow-driven security recognizers. Corpus boost flips
      `unescaped-output` to STRONG when an observed response contained the
      observed request-field verbatim.
- [x] **Rewrite engine (`@chrysalis/rewrite`, D15)** — confidence-gated IR
      rewrites driven by insight opportunities; `chrysalis rewrite` CLI
      applies patches, emits TypeScript, and writes a per-opportunity
      report. First pass `sanitize-output` wraps tainted concat leaves in
      `htmlspecialchars` (not the whole string — preserves literal HTML)
      and flips `html.template escape:false` to `true`. CI gate asserts
      the XSS recognizer's output is *actually fixed* in the emitted TS.
- [x] **Invariant verifier (`@chrysalis/rewrite/invariants`, D16)** —
      per-pass, per-opportunity structural-invariant checker between
      pre- and post-rewrite modules. Each pass declares the `dialect.op`
      shapes it is allowed to mutate (with optional `attrMatch` refinement
      for sub-shapes like `data.binop` with `operator: "."`); any
      out-of-allowlist mutation or effect-count change rolls the edit
      back and records a `verify-invariant-failed` entry in the report.
      Fast enough to run per-opportunity; complements full HTTP replay,
      which still runs post-rewrite for holistic behavior checks.
- [x] **Parameterize-sql pass (`@chrysalis/rewrite`, D17)** — second pass
      in the catalog. Ingest preserves the concat tree as a
      `sqlExpr` virtual-operand attr on `effect.db.query`; the pass
      walks it, inlines string literals as SQL text, and lifts every
      other leaf to a `?`-placeholder bound parameter. After rewrite
      `raw-sql-concat` no longer fires. Emitted TS for tiny-n1/lookup
      is now `queryAll("SELECT id, name FROM users WHERE id = ?", [id])`
      — structurally SQLi-proof. CI rewrite-gate asserts the fix via
      `scripts/ci-gates.mjs tiny-n1-rewrite` (TypeScript AST on emitted
      handlers + rewrite report JSON), not regex on source (D41).
- [x] Intent-preserving rewrites (v1, building on the D15 engine):
  - [x] `@chrysalis/rewrite` package scaffold — `RewritePass` interface,
        `applyRewrites` driver, `sanitize-output` first pass
  - [x] Raw SQL concat → parameterized literal (`parameterize-sql`;
        see D17)
  - [x] **Post-rewrite analysis gate (D18)** — re-runs each applied
        opportunity's recognizer after the batch lands and rolls back
        all-or-nothing if any applied rewrite failed to fix its
        finding. Covers "the pass lied" bugs that invariants can't
        catch. Default-on in the CLI.
  - [x] **Behavior-verify gate (D19)** — in-process IR simulator
        evaluates each route under both pre- and post-rewrite
        modules against synthesized benign + attack probe inputs,
        and rolls back all-or-nothing on any divergence the set of
        applied passes doesn't account for. Catches silent
        regressions that neither invariants nor recognizer re-runs
        can see (dropped echoes, swapped redirects, phantom session
        writes). Opt-in via `chrysalis rewrite --verify-behavior`;
        CI exercises it end-to-end on `fixtures/tiny-n1`.
  - [x] **HTTP-replay gate (D20)** — `replayCorpus` accepts injected
        `fetch` (in-process Hono / Fastify `inject`). `applyRewritesAsync` runs the
        corpus after a successful batch and rolls back on any
        `diffResponse` divergence. Emitted apps split into
        `src/server.ts` (`export const app`) + `src/index.ts`
        (listen only). **Caveat:** PHP-captured bodies diverge after
        `sanitize-output`; use D19 for that contract, or a TS-golden
        corpus for D20. **CLI:** `chrysalis rewrite --http-replay
        <traces> --out <dir>` (optional `--http-replay-skip-install`,
        `--target=hono|fastify`, `--http-replay-backends=hono,fastify` for D26).
        **CI:** `rewrite-gate` exercises D19 + emit checks; full D20 HTTP-replay
        against a checked-in golden corpus remains an optional tighten-up (large
        artifact).
  - [x] `foreach` accumulator → `.map`/`.reduce`/loop chooser — ingest lowers
        `+=` / `-=` / `.=` / `??=` on simple variables to binops; **emit** emits
        `Array.reduce` when a literal init + foreach + single `__assign` with
        `acc binop expr(loopVar)` matches (v1 subset).
  - [x] Inline `$_POST` validation → boundary normalize — **`boundary-zod`** pass
        (D44) consumes `scattered-validation` for `body` fields: prepends
        `parseZodBodyFieldRaw` (runtime helper, zod-shaped contract without npm
        `zod`) and rewires `request.field` uses to a shared `param`. Does not
        remove legacy guard IR (follow-up: dead-code cleanup / stricter schemas).
  - [x] N+1 detection → batched loader — **`batch-n1-read`** (D43) batches every
        **assign-wrapped** qualifying inner read in the loop (disambiguated vars
        when multiple). **`SELECT *`** inner selects batch using the FK column as
        the projected list. **Deferred post-M2:** bare inner reads without
        `__assign`, corpus-only confidence gating.
  - [x] **Emit (D21):** matching chains lower to a TS `switch` (shared
        `matchStringDispatchChain` with insight; see Milestone 1 emit).
  - [x] String dispatch → discriminated union + `z.enum`
        — **`dispatch-union-zod`** pass (`__chrysalis_zod_enum_body_field` →
        `parseZodEnumBodyFieldRaw` in emitted runtimes; D19 simulator parity).
        Consumes `string-dispatch` opportunities; post-verify clears the finding.
- [x] Archaeology v2: infer enum types from observed traces + DB CHECK constraints
      (`sql.query.rows` string literals, cardinality cap; CHECK/ENUM validated
      against literals; D28)
- [x] Oracle: outbound HTTP + mail recording (D32: `http.outbound` stream
      wrapper; `mail.send` via `Chrysalis\Oracle\Mail::send`; schema + corpus
      summary; `mysqli` / cURL-only apps still partial)
- [x] CI: fixture suite with golden WebIR snapshots and golden generated TS
      (`pnpm run update:golden`; `packages/ingest/tests/golden-webir.test.ts`,
      `packages/emit-hono/tests/golden-emit.test.ts`)
- [x] Verify: same oracle corpus replayed in-process against **Hono + Fastify**
      emits (`scripts/verify-tiny-blog.mjs`, D25; reports under `reports/verify/*`)
- [x] Chimera: canary mode with percentage routing + user-hash stickiness
      (`mode=canary`, `canary.percentModern`, cookie/header/IP stickiness + salt;
      `x-chrysalis-canary: in|out|n/a`; see `packages/runtime-chimera`)

---

## Milestone 3 — Repair loop (4–6 weeks)

Close the LLM-verified feedback loop.

**Status: complete (v1).** Verify-gated loop, optional HTTP chat proposer, hole
patches, diagnostics, and `--write-module` are shipped; default CLI proposer
remains a **stub** when `--llm` is not passed (by design).

- [x] Divergence attribution v1: heuristic ≤5 IR nodes per failure (with ingest
      `module` on replay); precise maps deferred
- [x] Repair pass interface: `@chrysalis/repair` (`RepairProposer`, edits via
      `applyModuleEdits`)
- [x] Patches are **always** full-corpus re-verified in `runVerifiedRepairLoop`
- [x] CLI: `chrysalis repair <traces-dir> --base-url <url> --project <php-root>`
      (bounded `--max-iter`; optional `--llm` + `CHRYSALIS_REPAIR_LLM_*` for HTTP chat proposer)
- [x] Opt-in **HTTP Chat Completions** repair proposer (`createHttpChatRepairProposer*`,
      `replaceOperand`-only JSON, neighbor catalog from attributed nodes; tooling-only
      network — not emitted handler code)
- [x] Operand edits from the loop record `provenance` with `source: "repair-pass"`
- [x] Hole auto-closure API: `applyHoleClosure` + `applyHoleClosureAndVerify`
      (`@chrysalis/repair`) — replacement subgraph, `hand-authored` sign-off on
      the new root, full-corpus replay gate; v1 supports a single operand parent
      per hole
- [x] **`--hole-patch`** on `chrysalis repair` — `parseHoleClosurePatchJson` +
      `applyHoleClosureAndVerify` (human-authored JSON, same verify gate as the loop)
- [x] **`--repair-verbose`** / `CHRYSALIS_REPAIR_VERBOSE` — stderr diagnostics for
      the HTTP chat repair proposer (HTTP errors, empty model output, invalid edits)
- [x] **`--write-module`** after successful repair or hole-patch — WebIR golden snapshot
      (`moduleToGoldenSnapshot` relative to `--project`)
- [x] **Hole-patch validation** — known `Effect.kind` / `WebIRType.kind` sets reject typos

---

## Milestone 4 — First real app (open-ended)

**Goal:** one public flagship migration with the four success metrics visible on
every commit (see `DESIGN.md` and `chrysalis status` → `migration`).

**Official first target (v1):** a **small Laravel** app (Breeze or similar
starter + a handful of routes we control). Tractable routing, Composer
autoload, and Blade/HTTP patterns without WordPress-style global hooks.

**Tracker:** `flagship/README.md` (vendor tree and CI wiring land there as the
app is adopted).

Candidates after the Laravel pilot (rough tractability order):
2. osTicket
3. phpBB (hard; good stress test)
4. WordPress — **not yet** (dedicated design spike: plugins, `wp_*`, hooks)

**Phased checklist**

- [x] Dashboard roll-up: `chrysalis status` exposes `migration` (IR coverage
      when `--project` is set; correctness from verify reports; optional
      `reports/migration/idiomaticity.json` and `residual-legacy.json`)
- [x] Flagship skeleton under `flagship/laravel-min` (Laravel-**shaped** tree +
      `chrysalis.routes.json`; full Composer Laravel documented in README, not
      vendored)
- [x] First ingest + emit slice (GET `/`, zero holes) gated in CI via ingest +
      emit-hono tests
- [x] Oracle corpus + verify gate for `laravel-min` (`scripts/verify-flagship-laravel-min.mjs`,
      CI job `verify-flagship-laravel-min`; PHP docroot `public/`)
- [x] Publish `migration` status JSON as a CI artifact (`flagship-laravel-min.json`)
- [x] Oracle footprint on `chrysalis status` (`computeOracleFootprint` in
      `@chrysalis/webir`; hydration index, read/write hints, full `routes[]` in
      `--json`, `reports/oracle-footprint.json` under `--project` — D39/D40)

**Pilot slice status:** `laravel-min` satisfies the phased checklist (dashboard,
ingest/emit, dual verify, migration artifact). **v1.1–v1.3:** `GET /health`,
`GET /items` (`query_all`), **`GET /count`** (`query_one` aggregate), **`GET /hello`**
(`$_GET['name']` + `trim`), **`GET /jump`** (`header('Location: /health')` redirect), **`GET /api/health`**
(JSON body, `application/json`), **`GET /robots.txt`** (plain crawl policy),
**`GET /humans.txt`** (plain `humans.txt` credits), **`GET /.well-known/security.txt`**
(RFC 9116-style plain text, fixture contact lines only), **`GET /sitemap.xml`**
(minimal sitemap index, **`application/xml`**, fixed fixture **`loc`** only),
**`GET /css/pilot.css`** (static stylesheet, **`text/css`**, fixture rules only),
**`GET /manifest.webmanifest`** (PWA manifest, **`application/manifest+json`**, fixed literal body),
**`POST /echo`**
(`$_POST['msg']`), **`GET /session/visit`** (PHP `session_start` +
`session_name('chrysalis_sid')`, `$_SESSION['visits']` counter; verify hits it
twice with cookie chaining so replay matches emitted session middleware),
**`GET /login`** + **`POST /login`** (static CSRF token + **`password_verify`** over
**`users`** via **`query_one`**), **`POST /logout`**, **`GET /session/me`** (session user id;
verify: `me` → login form+POST → `me` → logout → `me`) on SQLite
(`schema.sql` → `data/app.sqlite`, same seed into emitted `blog.sqlite` for SQL
replay); `composer.json` + CI `composer install` loads `vendor/autoload.php`;
verify script drives **thirty-one** HTTP requests (sixteen sequential `GET`s in the base path loop,
      two `GET /hello?name=…`, one `GET /jump` (302, `redirect: manual`), two `POST /echo` bodies,
      two `GET /session/visit`, two `GET /api/health`, then session/`login`/`logout` chain as in `verify-flagship-laravel-min.mjs`; base loop includes `/robots.txt`, `/humans.txt`, `/.well-known/security.txt`, `/sitemap.xml`, `/css/pilot.css`, and `/manifest.webmanifest`).
      Optional **idiomaticity** / **residual-legacy** JSON hooks for `chrysalis status`
      are documented under `flagship/laravel-min/migration-reports/README.md`.
      **Still open:** replace the skeleton with
Composer Laravel / Breeze, full-stack auth (rotating CSRF, gateways, MFA/OAuth),
even larger corpora than the scripted driver, and track
monotonic **coverage / correctness / idiomaticity / residual-legacy** on `main`
with a short narrative in `flagship/README.md`.

- [x] **Composer Laravel flagship wiring** — `flagship/laravel-full` adoption docs +
      **`pnpm run scaffold:laravel-full`** (gitignored **`flagship/chrysalis-laravel-work/`**);
      committed **`chrysalis-templates/`** + ingest test + scaffold wiring for
      **`GET /chrysalis-ping`** + **`GET /chrysalis-health.txt`** +
      **`GET /api/chrysalis-health`** + **`GET /chrysalis-jump`** +
      **`GET /chrysalis-count`** + **`GET /chrysalis-framework`** + **`GET /chrysalis-first-item`** +
      **`GET /chrysalis-last-item`** +
      **`GET /chrysalis-items`** + **`GET /chrysalis-lib-count`** +
      **`GET /chrysalis-session/visit`** + **`GET /chrysalis-session/me`** +
      **`POST /chrysalis-session/login`** + **`POST /chrysalis-session/logout`** +
      **`GET /chrysalis-hello`** + **`POST /chrysalis-echo`**;
      **`pnpm run verify:laravel-full`** +
      **`pnpm run status:laravel-full`** (both optional; skip when scaffold traces/reports are absent);
      CI now has a dedicated **`verify flagship (laravel-full scaffold)`** job with cache-backed
      scaffold reuse.

---

## Cross-cutting, never-done work

- **Docs.** Every package `README.md` must stay current with its code.
  Drift is a bug.
- **Telemetry-free.** The tool does not phone home. Users can opt in to
  anonymous metrics later if we want a metrics story; opt-in only.
- **Security.** The oracle records production traffic. Secrets redaction in
  the trace corpus is a launch blocker, not a nice-to-have.
- **Performance.** Verification must be parallelizable across traces.
  Aim for thousands of traces per minute on a laptop.
