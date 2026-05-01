# Chrysalis — Roadmap

> Read `DESIGN.md` first. This file is the execution plan for that design.

Milestones are intentionally thin vertical slices. Each milestone must produce a
runnable demo and measurable numbers, not a pile of abstractions.

**v1.0.1 (2026-04-29)** patch release: **install-from-tarball** steps in **`docs/INSTALLATION.md`**, GitHub Project bootstrap (**`docs/GITHUB_PROJECT.md`**), and an **idempotent tag release workflow** (upload assets when the GitHub Release already exists). **v1.0.0** was the first tagged source release with the full **`docs/`** set, **`LICENSE`**, and **`pnpm run release:artifacts`**. **Program tracking:** **`docs/GITHUB_PROJECT.md`** + **`pnpm run github:project-bootstrap`**. Ongoing engineering continues on **`main`** per the lanes below.

**Chrysalis 2.0** is chartered in **[Road to Chrysalis 2.0](#road-to-chrysalis-20--scale-out--warehouse-sized-codebases)** below: multi-server / massive-site **operations and performance** without relaxing **DESIGN.md** non-negotiables (behavioral oracle, WebIR, verify gates, holes, provenance).

**Milestone 4 v1 pilot is complete.** Milestones 0–3 and **Milestone 4 v1** (see
Milestone 4 below) meet the scoped acceptance. **Milestone 5 is now complete**
(see section below). **Milestone 6 checklist is complete.** **Milestone 6A (auth boundary scoped track)**
scoped checklist (D183–D192) is **complete**; deeper auth/vendor parity stays
cross-cutting under the same hole policy. Milestone 2
follow-ups that remain intentionally open-ended (Composer vendor
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
   - [x] Emits canonical PHP AST JSON via the glayzzle provider (D5) or the
         **`nikic/php-parser` subprocess** (**`provider: "nikic"`**, D195) with the
         same **`PhpAst`** shape; default CLI/ingest paths stay **glayzzle** unless
         configured.
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

## Milestone 4 — First real app

**Milestone 4 v1 pilot — status: COMPLETE (2026-04-25).** The **phased checklist**
below is fully checked: `laravel-min` ships a Laravel-shaped, Composer-autoloaded,
oracle-verified, dual-emit pilot with migration + footprint artifacts in CI;
`laravel-full` ships a **bounded** Composer adoption track (`chrysalis-templates/`,
scaffold, optional verify/status, dedicated CI). Ingest/emit parity for both
slices stays **zero-hole** on the committed manifests. This closes **M4 v1** as
the “first real app *pilot*” — not full Breeze production parity (see follow-ons).

**Goal (north star, unchanged):** one public flagship migration with the four
success metrics visible on every commit (see `DESIGN.md` and `chrysalis status`
→ `migration`). **v1 delivered:** coverage + correctness are **CI-gated and
machine-readable** for both pilots; idiomaticity + residual legacy remain
**optional sidecars** (documented under `flagship/laravel-min/migration-reports/`).

**Official first target (v1):** a **small Laravel** app (Breeze or similar
starter + a handful of routes we control). Tractable routing, Composer
autoload, and Blade/HTTP patterns without WordPress-style global hooks.

**Tracker:** `flagship/README.md` (vendor tree and CI wiring land there as the
app is adopted).

**Milestone 4+ follow-ons** — the working checklist lives under **Milestone 5 — Flagship depth** (section after the M4 v1 phased checklist). This heading stays for historical links and grep.

Candidates after the Laravel pilot (rough tractability order):
2. osTicket
3. phpBB (hard; good stress test)
4. WordPress — **not yet** (dedicated design spike: plugins, `wp_*`, hooks)

**Phased checklist (M4 v1 — all complete)**

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
      **Milestone 5** covers follow-on work (Composer/Breeze depth, production auth,
      larger corpora, optional sidecar metrics); `flagship/README.md` carries the dated **pilot snapshot** table for regression triage.

- [x] **Composer Laravel flagship wiring** — `flagship/laravel-full` adoption docs +
      **`pnpm run scaffold:laravel-full`** (gitignored **`flagship/chrysalis-laravel-work/`**);
      committed **`chrysalis-templates/`** + ingest test + scaffold wiring for
      **`GET /chrysalis-ping`** + **`GET /chrysalis-health.txt`** +
      **`GET /api/chrysalis-health`** + **`GET /chrysalis-jump`** +
      **`GET /chrysalis-count`** + **`GET /chrysalis-framework`** + **`GET /chrysalis-first-item`** +
      **`GET /chrysalis-last-item`** +
      **`GET /chrysalis-items`** + **`GET /chrysalis-lib-count`** +       **`GET /chrysalis-sum-ids`** +
      **`GET /chrysalis-min-id`** +
      **`GET /chrysalis-max-id`** +
      **`GET /chrysalis-avg-id`** +
      **`GET /chrysalis-id-span`** +
      **`GET /chrysalis-sum-squares`** +
      **`GET /chrysalis-even-count`** +
      **`GET /chrysalis-odd-count`** +
      **`GET /chrysalis-gt-two-count`** +
      **`GET /chrysalis-lt-three-count`** +
      **`GET /chrysalis-gte-two-count`** +
      **`GET /chrysalis-lte-three-count`** +
      **`GET /chrysalis-ne-two-count`** +
      **`GET /chrysalis-between-count`** +
      **`GET /chrysalis-eq-one-count`** +
      **`GET /chrysalis-eq-three-count`** +
      **`GET /chrysalis-eq-two-count`** +
      **`GET /chrysalis-ne-one-count`** +
      **`GET /chrysalis-ne-three-count`** +
      **`GET /chrysalis-lt-two-count`** +
      **`GET /chrysalis-session/visit`** + **`GET /chrysalis-session/me`** +
      **`POST /chrysalis-session/login`** + **`POST /chrysalis-session/logout`** +
      **`GET /chrysalis-hello`** + **`POST /chrysalis-echo`**;
      **`pnpm run verify:laravel-full`** +
      **`pnpm run status:laravel-full`** (both optional; skip when scaffold traces/reports are absent);
      CI now has a dedicated **`verify flagship (laravel-full scaffold)`** job with cache-backed
      scaffold reuse.

---

## Milestone 5 — Flagship depth

**Status: complete (D84–D160: canonical worktree, Breeze coexistence, template oracle growth + complexity ladder, laravel-min method-guard coverage expansion).** This milestone **does not reopen** the M4 v1
checklist. Acceptance patterns (zero-hole manifests where we claim parity, verify
when scripted, `chrysalis status` inputs documented) stay the same as M4 v1 unless
`DESIGN.md` Decision Log says otherwise.

**Goal:** deepen the **Composer-backed** flagship (**`chrysalis-laravel-work/`** as the canonical
full Laravel root today; **`laravel-min/`** as the parallel Laravel-shaped fast fixture until we
consolidate) toward starter-kit surfaces, richer oracle corpora, and optional release gates for
idiomaticity / residual-legacy JSON.

**Checklist:**

- [x] **Canonical Composer Laravel root:** **`flagship/chrysalis-laravel-work/`** (gitignored) is
      the default **full** Laravel tree for ingest/oracle/verify (`pnpm run scaffold:laravel-full`
      materializes or refreshes it from **`flagship/laravel-full/chrysalis-templates/`**). CI job
      **`verify flagship (laravel-full scaffold)`** runs scaffold → **`verify:laravel-full`** →
      **`status:laravel-full`** with cache-backed worktree reuse (D84).
- [x] **`laravel-min` decision (D122):** keep as the **shaped**, fast regression fixture and
      retain its dedicated oracle harness. Do **not** fold into `laravel-full`; its role is
      quick CI signal, deterministic triage, and migration sidecar continuity.
- [x] **Breeze coexistence:** **`pnpm run scaffold:laravel-full`** supports **`--with-breeze`** /
      **`CHRYSALIS_SCAFFOLD_BREEZE=1`** (alias **`pnpm run scaffold:laravel-full:breeze`**) — Composer
      requires **`laravel/breeze`**, **`php artisan breeze:install blade --no-interaction --pest`**, SQLite
      **`migrate --force`**, then **`npm ci`/`npm install`** + **`npm run build`** before Chrysalis
      template sync. CI sets the env var on **`verify flagship (laravel-full scaffold)`** so
      **`verify:laravel-full`** gates a tree where Breeze and Chrysalis routes coexist; ingest remains
      **`chrysalis.routes.json`-only** (D85). **Decision (D122):** keep Breeze first-party auth UI
      out of parity scope for now; do not onboard Breeze handler entrypoints until a dedicated milestone.
- [x] Production-shaped auth boundary (D122): rotating CSRF internals, gateways, MFA/OAuth
      remain explicitly **out of owned parity scope** for current milestones; represent via
      holes and residual-legacy reporting until a focused auth milestone is opened.
- [x] Larger oracle corpora than scripted drivers; pipeline-owned **idiomaticity** and
      **residual-legacy** JSON when those numbers should gate releases (**partial D132:** flagship
      verify emits **`flagship-laravel-full-emit-stats.json`**; **`status:laravel-full`** writes
      **`idiomaticity.json`** + **`residual-legacy.json`** from emitted-handler compat scan + hole
      density; **`laravel-min`** mirror (**`flagship-laravel-min-emit-stats.json`** +
      **`pnpm run status:laravel-min`**, D133); optional **`migration-sidecar-floors`**
      CI gate (D134, env **`CHRYSALIS_IDIOMATICITY_MIN`** / **`CHRYSALIS_RESIDUAL_LEGACY_MAX`**);
      chimera production `legacyRequestPct` remains a separate integration). **D135:** extra
      **`chrysalis-hello`** query shapes + semantic bodies in **`verify:laravel-full`** capture.
      **D136:** same idea on **`laravel-min`** for **`GET /hello`** + post-capture body assertions
      in **`verify:flagship`**. **D137/D138:** broadened `verify:flagship` post-capture semantics
      for core/session plus metadata/static contracts (`/robots.txt`, `/humans.txt`,
      `/.well-known/security.txt`, `/sitemap.xml`, `/css/pilot.css`, `/manifest.webmanifest`).
      **D139:** adds stable cross-backend verify-report parity checks (Hono/Fastify)
      in `verify:flagship` to catch emitter drift on the same corpus.
      **D140:** adds echo request-shape negatives and method guard checks in
      `verify:flagship` (`POST /echo` empty/json => 400 + body; `GET /echo` => 404).
      **D141:** pins **`GET /`**, **`/items`**, **`/count`**, **`/session/visit`**, **`/login`**
      semantics in `verify:flagship` post-capture checks (seeded DB + visit counter).
      **D142:** one extra oracle **`POST /login`** (bad CSRF) + mixed-status assertion helpers.
      **D143:** two more **`POST /login`** negatives (wrong password, empty creds) + corpus pins.
      **D144:** wrong-method **`GET /logout`** (**404**) in `verify:flagship` oracle + semantics.
      **D145:** wrong-method **`POST /session/me`** (**404**) in `verify:flagship` oracle + semantics.
      **D146:** wrong-method **`POST /session/visit`** (**404**) in `verify:flagship` oracle + semantics.
      **D147:** wrong-method **`POST /count`** (**404**) in `verify:flagship` oracle + semantics.
      **D148:** wrong-method **`POST /items`** (**404**) in `verify:flagship` oracle + semantics.
      **D149:** wrong-method **`POST /health`** (**404**) in `verify:flagship` oracle + semantics.
      **D150:** wrong-method **`POST /api/health`** (**404**) in `verify:flagship` oracle + semantics.
      **D151:** wrong-method **`POST /jump`** (**404**) in `verify:flagship` oracle + semantics.
      **D152:** wrong-method **`POST /hello`** (**404**) in `verify:flagship` oracle + semantics.
      **D153:** wrong-method **`POST /`** (**404**) in `verify:flagship` oracle + semantics.
      **D154:** wrong-method **`POST /robots.txt`** (**404**) in `verify:flagship` oracle + semantics.
      **D155:** wrong-method **`POST /humans.txt`** (**404**) in `verify:flagship` oracle + semantics.
      **D156:** wrong-method **`POST /.well-known/security.txt`** (**404**) in `verify:flagship` oracle + semantics.
      **D157:** wrong-method **`POST /sitemap.xml`** (**404**) in `verify:flagship` oracle + semantics.
      **D158:** wrong-method **`POST /css/pilot.css`** (**404**) in `verify:flagship` oracle + semantics.
      **D159:** wrong-method **`POST /manifest.webmanifest`** (**404**) in `verify:flagship` oracle + semantics.
      **D160:** wrong-method **`PUT /login`** (**404**) in `verify:flagship` oracle + semantics.
      **Incremental (D86–D115):**
      **`GET /chrysalis-min-id`** / **`GET /chrysalis-max-id`** / **`GET /chrysalis-avg-id`** / **`GET /chrysalis-id-span`**
      / **`GET /chrysalis-sum-squares`** / **`GET /chrysalis-even-count`** / **`GET /chrysalis-odd-count`**
      / **`GET /chrysalis-gt-two-count`** / **`GET /chrysalis-lt-three-count`** / **`GET /chrysalis-gte-two-count`**
      / **`GET /chrysalis-lte-three-count`** / **`GET /chrysalis-ne-two-count`** / **`GET /chrysalis-between-count`**
      / **`GET /chrysalis-eq-one-count`** / **`GET /chrysalis-eq-three-count`** / **`GET /chrysalis-eq-two-count`**
      / **`GET /chrysalis-ne-one-count`** / **`GET /chrysalis-ne-three-count`** / **`GET /chrysalis-lt-two-count`**
      / **`GET /chrysalis-gt-one-count`** / **`GET /chrysalis-gte-one-count`** / **`GET /chrysalis-lte-one-count`**
      / **`GET /chrysalis-between-one-two-count`** / **`GET /chrysalis-gt-three-count`**
      / **`GET /chrysalis-lt-one-count`** / **`GET /chrysalis-gte-three-count`**
      / **`GET /chrysalis-lte-two-count`** / **`GET /chrysalis-eq-zero-count`**
      / **`GET /chrysalis-ne-zero-count`** / **`GET /chrysalis-items-snapshot`**
      / **`GET /chrysalis-items-group-parity`** / **`GET /chrysalis-items-cte-rollup`**
      / **`GET /chrysalis-recursive-stress`**
      (`MIN`/`MAX`/`ROUND(AVG(id))`/`MAX(id)-MIN(id)`/`SUM(id*id)` + mixed
      `COUNT/MIN/MAX/SUM` snapshot aggregates, manifest + **`verify:laravel-full`**
      + deterministic count/snapshot/group/CTE/recursive routes x2 each, plus
      stress replay (`verify:laravel-full:stress`) and semantic body assertions
      on high-complexity routes in the verify harness; plus seed-variant replay
      matrix (`verify:laravel-full:seed-matrix`) for **`baseline`** / **`empty`** /
      **`ten`** seeded DB states with per-seed semantic assertions; plus
      five-nines confidence gate (`verify:laravel-full:5nines`) adding negative-path
      assertions (`GET /chrysalis-session/login` method guard + bad-login semantics),
      metamorphic cross-route invariants, and a pipeline confidence artifact
      at `reports/confidence/flagship-laravel-full.json` with per-cell numeric KPI
      thresholds enforced by `confidence-5nines`, plus rolling history gate
      (`confidence-trend`) over `reports/confidence/history/flagship-laravel-full.history.json`
      with a strict CI lane (`VERIFY_THRESHOLD=0.99999`) and auto-switch from
      warmup to strict mode once history reaches `CONFIDENCE_STREAK_REQUIRED`,
      plus request-shape robustness checks (JSON/form mismatch + method guard on
      form handlers) represented as a dedicated confidence risk cell, plus
      session idempotency checks (repeat logout stability) as another confidence
      risk cell, plus session transition monotonicity checks (`me` sequence
      `null -> flagship -> null -> flagship`) as another confidence risk cell,
      plus header contract strictness and redirect location invariants as
      dedicated confidence risk cells, plus cookie/session header invariants
      (`set-cookie` carries `chrysalis_sid=` on session transitions) as a
      dedicated confidence risk cell) plus `cross-backend-verify-parity` (Hono vs
      Fastify run-1 stable verify report match) plus trend-history parity carry-
      forward (`crossBackendParityOk` in streak entries), plus
      `matrixCrossBackendParityOk` on the parent JSON when the seed matrix runs, on
      **`chrysalis-templates/`** — **fifty-two** template routes, dual emit parity tests updated.

**Tracker:** `flagship/README.md` and `flagship/laravel-full/README.md`.

---

## Milestone 6 — Depth follow-ons

**Status: complete.** Milestone 5 is complete; this milestone captures explicit
follow-ons that were intentionally optional/deferred so they can be executed as
tracked checklist items.

**Goal:** convert deferred backlog into verify-safe, measurable deliverables
without weakening corpus replay gates.

**Checklist:**

- [x] **Composer/vendor effect depth:** extend call/effect overlay for Composer vendor
      callees (sound widening first), with fixtures + goldens + effect annotation parity.
      **D171:** `effectsReachableWithCallOverlay` matches FQN callees to short
      `FunctionDecl` overlay keys via unqualified-tail merge; ingest fixture + webir
      tests; Vitest aliases `@chrysalis/webir` to `src/` (stale `dist/` was masking
      ingest↔webir integration). Class methods / PSR-4 symbol maps remain follow-ons.
      **D172:** glayzzle provider flattens `namespace` blocks, qualifies top-level
      `FunctionDecl` names, maps `usegroup` to `Noop`, bumps parser `SCHEMA_VERSION`
      to `0.1.2`; narrows vendor overlay vs FQN calls when declarations live in a
      namespace. Braced-only / class / const declarations in namespaces remain partial.
      **D173:** ingest `convertCall` lowers `Class::method()` (parser `callee` as
      `StaticFetch`) to `data.call` for overlay hooks; class method bodies in the
      call-effect map are still not collected (parser `class` remains `Unknown`).
      **D174:** glayzzle now flattens top-level static class methods into synthetic
      `FunctionDecl` entries (`Ns\Class::method`), so vendor class helpers
      participate in call-overlay fixpointing.
      **D181:** `buildCallEffectMap` now reads vendor package `composer.json`
      autoload metadata (`autoload.files`, `autoload.psr-4`) in addition to
      recursive `vendor/**/*.php` fallback; adds regression fixture proving
      non-`.php` autoloaded helpers (e.g. `.inc`) participate in overlay effects.
- [x] **Effect narrowing follow-up:** add confidence-preserving narrowing where
      over-approximation is currently too coarse, without reducing safety; include
      regression fixtures proving no missed side effects.
      **D168:** deepens `call_user_func*` narrowing with callable-name normalization
      (leading `\`) plus safe fallback widening for unknown literal callees;
      regression tests cover narrowed + fallback paths.
      **D175:** narrows `call_user_func*` when callable is an array literal
      lowered as `__array_literal` + string literals (e.g. `["Ns\\Class","run"]`
      → `Ns\\Class::run`) before overlay match; unknown/dynamic arrays keep full
      widening fallback.
      **D182:** narrows `call_user_func*` for explicit callable choice nodes
      (`__ternary`, `??`) by unioning effects of resolved branches only; keeps
      full widening fallback when any branch is unresolved or unmapped.
- [x] **Oracle breadth (`mysqli` path):** add first-class `mysqli` capture/replay
      support to complement PDO, with schema/tests and corpus summary integration.
      **D165:** ships `Chrysalis\Oracle\Db\MySQLi` `query()`-path SQL capture
      (driver/sql/duration/rowCount/shape) + bootstrap/README wiring.
      **D169:** adds `MySQLiStatement` (`prepare` / `execute` / `get_result` /
      `store_result`), buffered `query()` rows for store-result selects, and
      consistent `driver: "mysqli"`; `MYSQLI_USE_RESULT` / non-mysqlnd gaps remain
      follow-ons if needed.
      **D170:** prepared-statement `sql.query.params` from `execute([...])` or
      `bind_param()` snapshot (indirect `bind_param` via `call_user_func_array`
      not captured).
      **D177:** `MySQLiStatement::get_result()` on mysqlnd-less runtimes keeps
      pending SELECT capture alive so `store_result()` can still emit `sql.query`
      instead of dropping the event.
      **D180:** `MySQLi::query()` `MYSQLI_USE_RESULT` path now treats row count as
      unknown-at-capture (`rowCount: 0`) without consulting `num_rows`, avoiding
      premature/unreliable row-count reads on unbuffered cursors.
- [x] **Session infra production track:** define and ship shared-store session
      bridge option (Redis or equivalent) for chimera/cutover readiness; keep
      deterministic verify behavior.
      **D176:** emitted Hono/Fastify runtimes add shared SQLite session backend
      (`CHRYSALIS_SESSION_SQLITE_PATH`, table `chrysalis_sessions`) with existing
      memory/file fallback, preserving deterministic verify defaults.
      **D178:** emitted Hono/Fastify runtimes add Redis backend
      (`CHRYSALIS_SESSION_REDIS_URL`, keys `chrysalis:sess:*`) with sqlite/file/memory
      fallback order preserved; deterministic verify defaults unchanged unless
      explicitly configured.
      **D179:** adds `ci-gates` command `session-bridge-release` and repo script
      `pnpm run release-gate:session-bridge`, formalizing release policy:
      strict mode requires explicit backend selection, multi-host deploys require
      Redis + URL, and memory mode is blocked unless explicitly overridden.
- [x] **Migration sidecar release policy:** formalize when idiomaticity/residual
      sidecars become required release gates (including threshold policy + CI lane).
      **D166:** adds `ci-gates` command `migration-sidecar-floors-release`
      (defaults: idiomaticity >= `0.01`, residual legacy <= `50`) and repo script
      `pnpm run release-gate:migration-sidecars`; flagship CI lanes now use the
      release-gate command instead of ad-hoc env wiring.
- [x] **Auth boundary milestone carve-out:** open dedicated scope for production auth
      internals currently out of owned parity scope (rotating CSRF internals,
      gateways, MFA/OAuth), with explicit hole policy and success metrics.
      **D167:** adds a dedicated scoped auth track definition below so this work
      no longer lives as an implicit deferred note.

**Tracker (planned):** `flagship/README.md`, `flagship/laravel-full/README.md`,
and this roadmap section.

---

## Milestone 6A — Auth boundary

**Status: widened charter (D189).** Flagship **laravel-min** + **laravel-full** pilots remain the
baseline oracle + dual-backend gates (D188). The milestone **now owns** the Laravel-first-party
auth/adoption slice end-to-end **subject to DESIGN §3 oracle validation** — not merely procedural
login stubs.

**Scope (owned — D189):**
- Session-bound identity flows plus **POST negatives** (CSRF/credentials/password), logout,
  session-bound **`me`/identity reads** — gated today via **`milestone-6a-auth-verify-gate.mjs`**
- **`Gate` / policies / `Authorization`** call sites — WebIR lowering where feasible;
  otherwise **`auth:`** holes / **`auth:` unresolved emits** until oracle-backed fixtures land
- **Sanctum / Passport / PAT / token guards** — explicit **`auth:`** tagging + residual metrics;
  parity claims require traces, not source-only stubs
- **Fortify / Breeze / Socialite / OAuth2-shaped surfaces** — inherit the same hole-first policy;
  widening commits Chrysalis to **tracking + fixtures + metrics**, not silent vendor emulation
- Rotating **CSRF/session token lifecycle** semantics where captured by oracle replay

**Scope (explicit exclusions — unchanged principles):**
- Handler output **without** oracle-backed verification for emitted TS (DESIGN §3)
- MFA/device cryptographic ceremonies **without** a reproducible corpus — emit **`auth:`** holes
- Proprietary stacks **until** the operator attaches an **`observe`-compatible NDJSON corpus**
  (same rule as other Chimera adoption tracks)

**Hole policy:** unsupported constructs remain **`auth:`-labeled holes** (ingest + emit) and appear in
residual sidecars; **no** silent best-effort translation that bypasses WebIR or weakens dual-stack honesty.

**Success metrics (owned slice — flagship pilots):**
- [x] representative oracle corpus includes auth boundary positive + negative traces
      (**laravel-min**: CSRF/password/credential negatives + login/logout/session/me;
      **laravel-full scaffold**: session login/me/logout Chrysalis routes — captured before ingest)
- [x] verify replay keeps correctness gate for auth routes at target threshold (aggregate gate plus
      explicit **auth-route subset gate** at `VERIFY_THRESHOLD` — D188)
- [x] residual-legacy report exposes paired emit + ingest auth-hole counts (`authEmitHoleMax`,
      `authIngestHoleMax`) for closure trending — D188
- [x] flagship README + DESIGN decision log state parity scope vs backlog (D188)

**Checklist (incremental):**
- [x] **Auth-tagged emit holes + migration sidecar (D183):** unresolved `data.call`
  sites whose callee matches auth-boundary heuristics (e.g. `Gate::…`, `auth`,
  CSRF/Sanctum/Passport tokens) emit `auth:unresolved call: …` reasons; flagship
  emit-stats add per-emitter `authHoles`; `residual-legacy.json` adds
  `authLegacyRequestPct` + `authEmitHoleMax` for trend tracking.
- [x] **Status dashboard auth metrics (D184):** `chrysalis status` (human + `--json`)
  reads optional 6A fields from `residual-legacy.json` into `migration`
  (`authResidualLegacyRequestPct`, `authEmitHoleMax`) and prints the auth line next
  to legacy-req density.
- [x] **Ingest IR `auth:` hole reasons (D185):** `isAuthBoundaryCallee` and
  `authTaggedHoleReason` live in `@chrysalis/webir`; every ingest `data.hole` reason
  passes through `authTaggedHoleReason` so static unknowns that mention
  auth-boundary symbols (e.g. `facades\Gate`, CSRF) are tagged consistently with
  emit-time auth holes; `@chrysalis/emit-shared` re-exports the helper from webir.
- [x] **Ingest `auth:` e2e + static detail (D186):** glayzzle static `Unknown` detail
  lists bound names; `fixtures/auth-tag-probe` + `auth-tagging-integration.test.ts`
  assert a `data.hole` with an `auth:`-prefixed reason for a `static $csrfToken` site.
- [x] **Ingest auth hole count in status/ingest (D187):** `countAuthTaggedHoles` in
  `@chrysalis/webir`; `chrysalis status --json` → `migration.coverage.authHoles`
  and human line; `chrysalis ingest` parenthetical when count is non-zero.
- [x] **Flagship auth-route verify gate + ingest residual snapshot (D188):**
  `scripts/milestone-6a-auth-verify-gate.mjs`; laravel-min + laravel-full verify scripts
  enforce threshold on auth oracle slice; emit-stats carries `ingest.{holes,authHoles}`;
  `residual-legacy.json` adds `authIngestHoleMax`; `chrysalis status` surfaces
  `migration.authIngestHoleMax`.
- [x] **Widened heuristic labeling (D189 foundation):** `@chrysalis/webir` `isAuthBoundaryCallee`
  includes Socialite/Fortify/OAuth-shaped callee token substrings (ingest + emit tagging).
- [x] **Gate/policy oracle probes (D190):** `GET /gate-probe` on **`flagship/laravel-min`**
  (stub `Illuminate\Support\Facades\Gate` in `lib/gate_facade_stub.php`); verify + M6A auth slice
  assert `allow:1` / `deny:1` bodies.
- [x] **OAuth/Sanctum scaffold probes (D190):** **`GET /chrysalis-auth-probe`** on
      **`chrysalis-templates`** (stubs `Laravel\Sanctum\NewAccessToken` + `League\OAuth2\Client\GenericProvider`);
      `verify-flagship-laravel-full` captures + pins JSON; M6A auth route list includes the path.
- [x] **`json_encode` + associative array lowering (D191):** single-arg `json_encode` lowers to
      `data.call` → emit `JSON.stringify`; PHP arrays whose items **all** use string literal keys lower to
      `__object_literal` (computed-key object TS); mixed keys → ingest hole. Auth-probe handler uses
      idiomatic `json_encode([...])` again.
- [x] **Socialite / Fortify oracle probe (D192):** **`GET /chrysalis-socialite-fortify-probe`** on
      **`chrysalis-templates`** with stubs **`Laravel\Socialite\Facades\Socialite::probe`** and
      **`Laravel\Fortify\Fortify::probe`**; ingest lowers both to string literals; verify pins JSON;
      M6A auth route list includes the path.

---

## Cross-cutting, never-done work

- **PHP surface vs glayzzle.** Parser coverage grows incrementally (D193 `throw` + `new`,
  D194 FQN `new`, D195 `provider: "nikic"` with **`nikic-json.ts`** parity, D196 ingest/CLI
  **`--parser-provider`** wiring across project-level workflows, D197 FQN ctor registry hook,
  D198 dynamic `new $x(...)` as `__new_dynamic` + runtime bridge, D199/D199b status visibility for
  dynamic constructor KPIs (`dynamicNewWebIrCount` + ingest hole reasons), D200 corpus-gated `parameterize-sql`,
  D201 corpus-gated `sanitize-output` + oracle footprint `dynamicNewCount` / `routesWithDynamicNew`).
- **Rewrite confidence.** `batch-n1-read` now handles assign-wrapped and bare inner reads and
  enforces corpus-backed gating (D197). Remaining rewrite depth should keep this confidence-first model.
- **Docs.** Every package `README.md` must stay current with its code.
  Drift is a bug.
- **Telemetry-free.** The tool does not phone home. Users can opt in to
  anonymous metrics later if we want a metrics story; opt-in only.
- **Security.** The oracle records production traffic. Secrets redaction in
  the trace corpus is a launch blocker, not a nice-to-have. **D202** widened
  `DEFAULT_REDACTION` (Node + PHP prelude lockstep); operators still customize
  via `chrysalis.observe.json`, merged onto defaults (**D208**) so partial files cannot drop baseline rules;
  **D209** validates file shape and surfaces parse errors in **`chrysalis observe`** (exit **2**).
  **D210:** strip UTF-8 BOM before parse; CI pins **`composer:v2`** for **`pretest`** vendor install.
  **D203:** `sql.row.*` rules redact sensitive
  **column values** inside captured SELECT **`rows`**. **D205:** targeted
  **`sql.params[<driver>:<sqlPrefix>].<index>`** bind redaction is implemented in
  **`oracle-php`** `Redactor.php` (grammar in `packages/oracle/src/redaction.ts`);
  DEFAULT stays conservative; operators add explicit bind rules where replay safety allows.
- **Performance.** Verification must be parallelizable across traces.
  **`replayCorpus`** now supports **`concurrency` > 1** when **`disableCookieChain: true`**
  (D202); cookie-chained corpora stay sequential by default. **D204:** **`chrysalis verify` /
  `repair`** expose the same knobs (flags + `CHRYSALIS_VERIFY_*` env); repo
  **`scripts/verify-tiny-blog.mjs`** and **`scripts/verify-flagship-laravel-*.mjs`** call
  **`resolveVerifyReplayExtras({})`** from **`@chrysalis/verify`** so harnesses honor the same env without duplicating parsing.
  **D206:** optional **`worker_threads`** replay when **`CHRYSALIS_VERIFY_WORKER_THREADS=1`** (and compatible knobs);
  **`sql.params`** defaults stay **mutation-only** so SELECT tape params stay stable. **D207:** worker entry
  **`replay-worker.js`** path fallback so **`src/replay.ts`** (Vitest) finds **`dist/replay-worker.js`**
  after a package build; regression tests for worker vs async pool and invalid combinations.

---

## Multi-lane program (parser, oracle, verify, holes)

**Status:** active (DESIGN **D211**, 2026-04). We are intentionally running **four tracks** in parallel —
not one mega-PR. Each wave ships a **thin vertical slice** (tests + docs + optional CLI/CI touch) so
`main` stays mergeable.

| Lane | North star | Depends on | First thin slices (examples) |
| ---- | ---------- | ---------- | ---------------------------- |
| **A — Parser contract** | Same repo, same CI: glayzzle default, **nikic** opt-in with **honest** skips when `vendor/` or `php` is missing; parity tests stay the oracle for shape drift. | `packages/parser-bridge`, Vitest, Composer pretest | **D213**–**D225:** CI nikic step; **nikic** strip-pos on **`fixtures/mysqli-probe`**, **`db-query-unknown-receiver-probe`**, **`fixtures/laravel-shaped-db-factory-probe`**, **`fixtures/parser-parity-probe`**. Next: widen contested-syntax pages as mapper gaps appear. |
| **B — Oracle depth** | Traces remain the spec: wider real stacks (**mysqli**, vendor autoload, edge drivers) **without** breaking redaction rules or SQL tape semantics. | oracle-php prelude, `Redactor.php` lockstep with `redaction.ts` | **D214**–**D225:** **`mysqli-probe`** + **`laravel-shaped-db-factory-probe`** (FQN **`Illuminate\...\DB::connection`**, **`App\...\Conn::make`**, **`Repo::db`**); **`D218`** negative (**`SQLite3`**). Next: optional body-proven widening (strict) or copy manifest lines into **`flagship/`** pilots when needed. |
| **C — Verify UX** | Operators can **act** on failure: which trace, which route, which divergence class, what to run next. | `replayCorpus`, report JSON, CLI | **D212**–**D223:** **`chrysalis verify --json-summary`** (machine **stdout**); **`schemaVersion`** + **`toolVersion`**; stderr failure diagnostics + per-trace divergences in human mode; **repair** pointers. **`migration-debt --json-out`** uses the same versioning pattern (**D226**, Lane **D**). **D228**–**D230:** dual-backend verify summary JSON in CI + **`ci-gates.mjs verify-dual-summary`** + **`pnpm run ci:verify-dual-summary`**. **D231:** **`readJsonGateArtifact`** for consistent JSON gate errors. |
| **D — Hole economics** | One place answers “where is debt?” — ingest vs emit vs auth vs dynamic **`new`**, trendable across commits. | `chrysalis status --json`, sidecars, `oracleFootprint` | **D213**–**D226:** **`migration-debt`** + **`--json-out`** (**`kind`**, **`schemaVersion`**, **`toolVersion`** — **D226**); CI **`migration-debt-json`** artifact; **`--max-holes`** / **`--min-correctness`** exit **4** gates. CI: **`typecheck-and-test`** enforces **`--max-holes`** on **tiny-blog**, **mysqli-probe**, **`db-query-unknown-receiver-probe`**, and **`laravel-shaped-db-factory-probe`**; **`verify-e2e`** enforces **`--max-holes 0`** + **`--min-correctness 1`** on **tiny-blog** after verify. Next: more fixtures if debt surfaces. |

**Sequencing rules**

1. **Oracle and redaction** win over convenience: no capture shortcut that breaks verify or leaks secrets.
2. **Parser parity** before widening ingest on contested syntax (nikic/glayzzle disagree → fix mapper or document hole).
3. **Verify UX** may land early; it mostly consumes existing reports.
4. **Hole economics** composes existing artifacts first; new fields need provenance in `DESIGN.md`.

**Wave 0 (done / in flight):** observe merge + validation (**D208–D210**), replay worker resolution (**D207**), parser-bridge nikic subprocess + pretest vendor, sql row/params redaction smoke in CI.

**Wave 1 (closed 2026-04-28):** **D213–D215** shipped verify narrowing, nikic CI honesty, **`migration-debt`** (+ **`--json-out`**), mysqli oracle CI smoke, **`fixtures/mysqli-probe`**, verify replay env consolidation, and parser parity on the mysqli route page.

**Wave 2 (closed 2026-04-28):** **D216** + **D217** ship **`db()->query`** and **`$db = db(); $db->query`** ingest lowering + mysqli-probe routes, **nikic** parity on route pages + **`lib/db.php`**, **`migration-debt`** JSON **CI artifact**, **`--max-holes` / `--min-correctness`** gates, **verify** stdout/stderr split for divergences, and **repair** stderr replay hints. Remaining “Next” bullets in the lane table above stay backlog (not Wave 2).

**Wave 3 (closed 2026-04-28):** **D221** adds **`new PDO`** **`->query`** tracking, **`fixtures/parser-parity-probe`** + expanded **nikic** surface, and **verify** stderr diagnostics (histogram + next steps off stdout).

**Wave 4 (closed 2026-04-28):** **D222**–**D226** — **`verify --json-summary`**; **`migration-debt --json-out`** versioned JSON (**D226**); ingest gates + **`dbFactoryReturnCallees`** (**D224**–**D225**). Next wave: deeper oracle stacks / contested-syntax parser pages as gaps appear / optional factory body proof (strict).

**Wave 5 (2026-04-29):** **D228**–**D231** — machine-readable **`chrysalis.verify.summary.dual`** artifacts for tiny-blog + flagship verify jobs; CI **`verify-dual-summary`** gate + profile env; flagship summary row parity with contract fields; **`readJsonGateArtifact`** extended to **`tiny-n1-rewrite`**, **`migration-sidecar-floors`**, and **`status-migration`** stdin (**`JSON.parse`** errors); root **`pnpm run ci:*`** shims for common **`ci-gates`** entrypoints; **`ci-gates-json-artifacts.test.ts`** covers migration sidecar missing/invalid/skip, **`confidence-trend`** warmup, **`tiny-n1-rewrite`** missing report, and invalid JSON across gates; **`README.md`**, **`AGENTS.md`**, **`packages/cli/README.md`** document **`ci:insight`** vs gate-only **`ci:tiny-n1-insight`**; committed **`.cursor/rules/chrysalis.mdc`** with local **`.cursor/*`** ignored elsewhere.

---

## Road to Chrysalis 2.0 — scale-out + warehouse-sized codebases

**North star:** Any team can run Chrysalis on **very large PHP estates** and **multi-node fleets**—capture, translate, verify, and operate dual-stack—without changing the thesis: **the running app remains the spec**, **WebIR stays the asset**, **verify stays the gate**, **holes stay honest**, **time/RNG/I/O stay injected** for replay.

**Explicit non-goals (same as `DESIGN.md` §3):** Skipping oracle-backed verification for speed; emitting TypeScript that bypasses WebIR; silent “best effort” for unsupported constructs; adding request-scoped PHP↔TS FFI beyond the existing chimera request unit.

This section is the **program roadmap to `v2.0.0`**. Milestones here are **numbered V2-M1…** so they do not collide with closed v1 milestones 0–6A. Work can interleave with the **Multi-lane program** above; sequencing rules below resolve conflicts.

### Dimensions of scale (all must remain measurable)

| Dimension | v1 reality | v2 target |
| --- | --- | --- |
| **Code volume** | Whole-tree ingest in one CLI invocation | **Resumable / incremental ingest** with content-addressed caches, bounded memory, documented sharding across subtrees |
| **Trace volume** | NDJSON per request; operator-managed disks | **Tiered corpora** (rotation, compression, optional object-store layout), **multi-host capture** with merge semantics and namespace rules |
| **Verify throughput** | Concurrency + optional `worker_threads` (D202–D207) | **Partitioned replay** (trace shards), **merged machine reports**, optional **worker fleet** protocol that preserves per-trace semantics |
| **Emit output size** | Monolithic generated app for pilots | **Chunked / multi-package emit layouts** where backends allow, keeping provenance on every surface |
| **Runtime / chimera** | Single proxy + Redis session option (M6) | **Coordinated multi-instance chimera** (routing tables, sticky shadow/canary), **%-traffic canary**, multi-AZ cutover **runbooks** |

### Milestone V2-M1 — Partitioned verify (provably equivalent sharding)

**Goal:** Operators can split a corpus into **K shards**, replay in parallel on separate machines or processes, and **merge** results into one report that matches **single-process** replay on a golden fixture (within existing diff semantics).

- [x] **Contract:** **`chrysalis.verify.summary.merged`** with **`schemaVersion: 1`** documents shard inputs, per-shard paths, and merged **`CorrectnessReport`**; **`toolVersion`** matches **`verify --json-summary`** discipline (**`buildMergedVerifySummaryJson`** in **`@chrysalis/verify`**).
- [x] **CLI / library:** **`chrysalis verify --shard-index i --shard-count K`** (and **`CHRYSALIS_VERIFY_SHARD_*`** env) filters traces deterministically; **`chrysalis verify-merge`** combines **`summary.json`** shards; **`mergeCorrectnessReports`** in **`@chrysalis/verify`**.
- [x] **Proof:** Vitest **`packages/verify/tests/replay.test.ts`** (partition + merge vs monolithic aggregate) and **`merge-partition.test.ts`**.
- [x] **Docs:** **`packages/verify/README.md`** + **`docs/OPERATIONS.md`** (partitioned verify + **`verify-merge`**).

**Done when:** CI runs at least one **partitioned + merged** verify path on a committed fixture and gates the merged JSON with **`ci-gates`**. **Closed:** **`verify-merged-summary`** gate + **`verify-tiny-blog.mjs`** **`reports/ci/verify-e2e-merged-summary.json`** + fixture **`fixtures/ci/verify-merged-summary-smoke.json`** in **`typecheck-and-test`**.

### Milestone V2-M2 — Resumable ingest + shard boundaries

**Goal:** Ingest **does not require** a single long-lived process that holds the entire IR in RAM; teams can define **shard roots** (e.g. service, bounded context, repo subtree) and resume after failure.

- [x] **Route-level ingest sharding (v1):** **`ingestDirectory`** **`shardIndex` / `shardCount`** filters manifest routes by **`routeFileShardBucket(file)`**; **`buildCallEffectMap`** keeps the **full** route list for sound lib widening. **`chrysalis ingest` / `emit`** **`--shard-*`**. Vitest **`packages/ingest/tests/route-shard-ingest.test.ts`**.
- [x] **Incremental cache (v1, opt-in):** **`ingestDirectory`** **`ingestCacheDir`** + **`loadOrParsePhpAstWithCache`** (SHA-256 of file bytes + parser provider + **`INGEST_AST_CACHE_VERSION`**); **`chrysalis ingest` / `emit`** **`--ingest-cache <dir>`**. Vitest **`packages/ingest/tests/parse-cache.test.ts`**. WebIR module merge / status aggregation remains future work.
- [x] **Merge model (v1):** **`mergeWebIrModules`** in **`@chrysalis/webir`** remaps node ids and unions disjoint shard roots; duplicate **`METHOD path`** on route roots throws. **`chrysalis ingest` / `emit` / `status`** accept **`--merge-all-shards --shard-count K`** to run **`ingestDirectory`** for each shard **`i`** and merge (Vitest: **`packages/webir/tests/merge-modules.test.ts`**, **`packages/ingest/tests/merge-webir-modules.test.ts`**, CLI **`merge-all-shards-ingest-cli.test.ts`**). **v2:** deduplicate shared **`lib/`** subgraphs across shards to match monolithic node counts (optional optimization).
- [x] **Synthetic many-route ingest (v0, CI-sized):** Vitest **`packages/ingest/tests/many-routes-synthetic-ingest.test.ts`** builds a temp **12-route** manifest + trivial PHP pages; asserts full ingest and **K=4** shard partition counts (documents a stress **size class**; optional **time/RSS** CI budgets remain future work).
- [ ] **Hole policy unchanged:** new scale paths must not introduce silent translation; cache misses fall back to full parse.

**Done when:** documented **N-file** ingest completes with **resume** after simulated crash; `status --json` reflects merged shard stats.

**Progress (2026-04-30):** **Parser-level resume / reuse** is covered by **`parse-cache`** Vitest (AST JSON keyed by bytes + parser + cache version). **Many-route shard math** is covered by the synthetic ingest test above. **Still open for full milestone closure:** WebIR **merge model** for shard outputs in **`status` / emit**, **emit-side** crash resume with partial artifacts on disk, **`status --json`** aggregation across shard emits, and optional **RSS/time** gates on the synthetic tree.

### Milestone V2-M3 — Multi-host oracle + corpus operations

**Goal:** Multiple **observe** agents (different hosts, envs, or canary cells) contribute traces into a **single operator workflow** without corrupting the spec story.

- [x] **Corpus layout (operator doc v1):** **`docs/ADMINISTRATION.md`** — multi-host trace directory conventions and merge discipline (path merge via **`corpus-merge`**; content dedupe/sampling still manual / future).
- [x] **Corpus tree merge (v1):** **`mergeCorpusDirectories`** + **`chrysalis corpus-merge`** copy **`YYYY-MM-DD/*.ndjson`** into one **`--out`** root; **`--on-duplicate error|skip`**, optional **`--dedupe-trace-id skip`** (header traceId winner by source order), deterministic sampling **`--sample-modulo K --sample-remainder R`** (traceId hash buckets), **`--dry-run`**, and **`--json-out`** machine summary (**`chrysalis.corpus-merge.summary`**). Vitest **`packages/oracle/tests/merge-corpus.test.ts`** + CLI tests; CI gate **`corpus-merge-summary`** on **`fixtures/ci/corpus-merge-summary-smoke.json`** (**`pnpm run ci:corpus-merge-summary`**).
- [x] **Multi-host merge → verify (v1, tiny-blog):** **`scripts/verify-tiny-blog.mjs`** splits captured NDJSON across **`reports/ci/traces-host-a`** and **`reports/ci/traces-host-b`**, merges into **`reports/ci/traces-merged-multi-host`**, asserts trace-count parity with the monolithic capture, and replays the merged corpus against **Hono** at **`VERIFY_THRESHOLD`** (same WebIR module as monolithic replays; **pristine `blog.sqlite` copy** for merged replay so DB state matches a fresh verify).
- [ ] **Retention:** rotation + compression; redaction remains **DEFAULT + observe merge** lockstep with `oracle-php`.
- [ ] **Ops docs:** `docs/ADMINISTRATION.md` extended for multi-host capture and storage sizing.

**Done when:** two synthetic “hosts” produce traces, merge runs, and **verify** passes against merged corpus on a fixture sized for CI. **Closed:** **`verify-tiny-blog.mjs`** path above (runs in **`verify-e2e`** when PHP is available).

### Milestone V2-M4 — Emit layout + build scalability

**Goal:** Generated TypeScript stays **auditable** but **fits** large teams’ build systems (incremental `tsc`, optional package boundaries).

- [ ] **Emit strategy flags** (per backend): e.g. route **file splitting**, shared **lib chunk**, lazy route registration where the server framework supports it—all with **provenance** preserved on emitted files.
- [ ] **Emit stats → CI:** extend existing emit-stats / migration sidecars with **layout metrics** (files, lines, largest handler) for regression budgets.

**Done when:** flagship or a new **large-layout** fixture proves **multi-file emit** at a configured threshold without losing verify parity on a pinned corpus subset.

### Milestone V2-M5 — Multi-instance chimera + traffic-shaped rollout

**Goal:** **More than one** chimera/proxy instance can share consistent **routing + session + shadow** semantics for large sites.

- [ ] **Shared config source:** routing table + mode (legacy/shadow/cutover/canary) from a **documented** shared store or signed file bundle; no ad-hoc per-node drift.
- [ ] **Canary percentage:** optional **%-traffic** to modern stack with **aggregate shadow metrics** (existing diff format extended, not replaced).
- [ ] **Session:** build on Redis bridge (M6); document **stickiness** requirements when shadow spans nodes.
- [ ] **Runbooks:** `docs/OPERATIONS.md` — multi-AZ cutover, rollback, “all nodes read same route map” checklist.

**Done when:** local or CI **multi-process** chimera demo (two nodes) + doc sign-off criteria; no weakening of verify before cutover.

### Milestone V2-M6 — Operator aggregation (optional, last)

**Goal:** **Fleet view**—many repos or many shards—feeds a dashboard that aggregates **`chrysalis status --json`** and verify summaries **without** becoming a new source of truth (read-only mirror of repo artifacts).

- [ ] **Schema:** stable JSON for uplink; versioned.
- [ ] **Privacy:** no third-party telemetry; self-hosted or air-gapped.

**Done when:** documented reference architecture + sample exporter script or minimal UI—**optional** for tagging `v2.0.0` if V2-M1–V5 are complete.

### Sequencing vs multi-lane work

1. **Redaction + corpus schema stability** (oracle lane) precedes any **default-on** multi-host merge that could mix secrets.
2. **Partitioned verify (V2-M1)** can land early; it mostly composes existing **`replayCorpus`** semantics.
3. **Incremental ingest (V2-M2)** should stay parser-accurate: **Lane A** parity gates apply before widening ingest shortcuts.
4. **Chimera multi-instance (V2-M5)** is operationally independent of ingest but **depends** on session + routing truth shared across nodes.

### v2.0.0 tag criteria (proposal)

- V2-M1 **and** V2-M2 **closed** (verify sharding + ingest resume are non-negotiable for “any size”).
- At least **one** of V2-M3 / V2-M4 **closed** (operators choose corpus-scale vs emit-scale priority).
- V2-M5 **closed** or explicitly **deferred** with DESIGN Decision Log entry if release must slip.
- `CHANGELOG.md` + `DESIGN.md` Decision Log summarize scale contracts (`schemaVersion` bumps, corpus layout version, chimera config version).


