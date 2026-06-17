# Chrysalis - Roadmap

> Read `DESIGN.md` first. This file is the **active** execution plan.
> Completed history - shipped G-series slices (through G2337), Milestones 0-6A,
> and the Road to Chrysalis 2.0 program - is archived in
> [`ROADMAP-ARCHIVE.md`](./ROADMAP-ARCHIVE.md).

Milestones are intentionally thin vertical slices: each must produce a runnable
demo and measurable numbers, not a pile of abstractions.

## Status (2026-06)

- **Releases:** `v1.0.0` -> `v2.0.x` tagged on `main`. The Chrysalis 2.0 scale-out
  milestones (`V2-M1`-`V2-M6`) are complete; see `CHANGELOG.md` and
  [`ROADMAP-ARCHIVE.md`](./ROADMAP-ARCHIVE.md).
- **v1 scope:** Milestones 0-6A complete (the closed v1 checklist - archived).
- **Active lanes:** the **Multi-lane program** (parser / oracle / verify / holes)
  and the **Post-2.0 depth backlog** below remain open and mergeable on `main`.
- **Recently shipped:** through **G2388** (`$obj::class` nikic parity, parser probe widening, B5.5 v14 `(float)` cast route **`/rho`**, 15-handler replay). The full slice log lives in [`ROADMAP-ARCHIVE.md`](./ROADMAP-ARCHIVE.md).

**Paused by policy (do not open without plan amendment):** matrix gold for
marketing; WordPress before Laravel boring; "any language production-ready" claims.

---

## Post-2.0 depth backlog (options)

The **v2.0.0** thesis and scale-out milestones are complete; the rows below track **post-2.0 depth** work that landed after the tags. **A, C, D, E** are implemented in-tree; **B** ships the **origin-insensitive structural dedupe** slice (**`mergeDedupeStructuralKeyIgnoringOrigin`**, CLI **`--ingest-dedupe-structural-subgraphs-ignore-origin`**); broader **IR helper lifting** for non-structurally-identical bodies remains future work (see **V2-M4** *Remaining* in [`ROADMAP-ARCHIVE.md`](./ROADMAP-ARCHIVE.md) and `docs/IR-HELPER-LIFTING.md`).

| Option | What | Where it lives today | Tracking |
| --- | --- | --- | --- |
| **A — Full ingest checkpoint** | Persist **partial WebIR** so ingest can **resume** after crash beyond **AST parse cache** + **route shards** + merge. | **`@chrysalis/webir`** **`module-checkpoint.ts`**, **`moduleBuilderResumeFromModule`**; **`@chrysalis/ingest`** **`ingest-checkpoint.ts`** + **`ingestDirectory`** options; CLI **`--ingest-checkpoint-file`**, **`--ingest-resume-checkpoint`** (rejected with **`--merge-all-shards`**). | [#2](https://github.com/theorem6/chrysalis/issues/2) |
| **B — IR helper lifting** | **B1–B4 v0:** fixtures + **`liftSharedHelpers`** / **`liftSharedHelpersSemantic`** / **`embedSharedHelperBodiesInModule`** (CLI **`--ingest-lift-shared-helpers`**, **`--ingest-lift-shared-helpers-semantic`**, **`--ingest-embed-shared-helper-bodies`**; structural dedupe required). Call-effect canonicalization + helper roots merged into route module before dedupe. Design: **`docs/IR-HELPER-LIFTING.md`** (**D311**, **D323–D325**). | **`lift-shared-helpers.ts`**, **`library-effects.ts`**, **`merge-dedupe-key.ts`**, fixtures **`lift-helper-*`**. | [#3](https://github.com/theorem6/chrysalis/issues/3) |
| **C — Corpus rotation + multi-host ops** | **Day-bucket** archive mover for trace roots; multi-host merge discipline unchanged (**`corpus-merge`**). | **`scripts/corpus-rotate-archive.mjs`**, **`pnpm run corpus:rotate-archive`**; **`docs/ADMINISTRATION.md`** (Corpus volume and retention). Vitest **`packages/cli/tests/corpus-rotate-archive-script.test.ts`**. | [#4](https://github.com/theorem6/chrysalis/issues/4) |
| **D — `rediss://` (PHP sessions)** | TLS Redis URL support in the **PHP** session bridge. | **`RedisChrysalisSessionHandler`** **`doConnectRedis`**; smoke **`packages/oracle-php/tests/redis_session_bridge_smoke.php`**. | [#5](https://github.com/theorem6/chrysalis/issues/5) |
| **E — Fleet / chimera dashboards** | **Reference** Grafana starter dashboard (**operator-owned** datasource). | **`examples/grafana/README.md`**, **`examples/grafana/dashboards/chrysalis-operator-overview.json`**. | [#6](https://github.com/theorem6/chrysalis/issues/6) |

**Multi-runtime CLI (DESIGN D295):** **`go/shim/`** (Go **`exec`**) and **`python/chrysalis_shim/`** (**`subprocess`**) invoke the same built Node CLI (**`packages/cli/dist/bin.js`**). **`CHRYSALIS_CLI_JS`** / **`CHRYSALIS_NODE`** override discovery. Optional **`pnpm run test:cli-shims`** after **`pnpm --filter @chrysalis/cli build`**.


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
| **A — Parser contract** | Same repo, same CI: glayzzle default, **nikic** opt-in with **honest** skips when `vendor/` or `php` is missing; parity tests stay the oracle for shape drift. **`pretest`** installs **`vendor/`** via **`composer`** or **`scripts/parser-bridge-composer-install.mjs`** (**D270**) when **`php`** + network are available without global Composer. | `packages/parser-bridge`, Vitest, Composer pretest | **D213**–**D225:** CI nikic step; **nikic** strip-pos on **`fixtures/mysqli-probe`**, **`db-query-unknown-receiver-probe`**, **`fixtures/laravel-shaped-db-factory-probe`**, **`fixtures/parser-parity-probe`**. Next: widen contested-syntax pages as mapper gaps appear. |
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

**Wave 6 (2026-05-20):** **Lane A** — parser parity probes + **`wptp:d7-audit`**; flagship PDO oracle route (**D309**, **53** template routes), empty-seed + Hono **`__respond`** + CLI stress status; ingest **psr-4** vendor effects test; WPTP **echo-api** silver Next.js + Hono edges (**24** matrix rows); semver **2.0.2** (**`CHANGELOG.md`**).

### Commercial program (documentation + optional CLI gate)

**Status:** In-tree scaffolding on **`main`** (**DESIGN D289**). **`chrysalis init`** is **not** license-gated so vendor trees can be marked before keys are distributed (**D290**). **Not yet published** as a public commercial launch (no announced SKUs, pricing, or standalone **`@chrysalis/license`** npm product). **Purpose:** capture **revenue ordering** (services → support → licensed distribution → training → reference examples) in **`docs/COMMERCIAL.md`**, and ship **`@chrysalis/license`** + **`chrysalis license`** + **`CHRYSALIS_REQUIRE_LICENSE`** / **`CHRYSALIS_LICENSE_MIN_TIER`** for **future vendor** distributions. **Non-goals in-tree:** payment processors, activation servers, or metering.


---

## What's next (active backlog)

The default implementation queue is `docs/STRATEGIC-PLAN.md` § "Next 90 days"
(see `AGENTS.md`). Current build focus:

- **Lane A - parser contract:** widen contested-syntax parity pages
  (`fixtures/parser-parity-probe`) as glayzzle/nikic mapper gaps appear.
- **IR helper lifting (B5.x):** deepen shared-helper inlining/lifting per
  `docs/IR-HELPER-LIFTING.md` (gated by structural dedupe; DESIGN D310/D311).
- **Post-2.0 depth options A-E:** tracked in the table above (issues #2-#6).
- **Hub depth:** the post-queue program in
  `docs/CWL-FULLSTACK-POST-110-PROGRAM.md`.

Everything already shipped is logged in [`ROADMAP-ARCHIVE.md`](./ROADMAP-ARCHIVE.md).

