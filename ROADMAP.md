# Chrysalis - Roadmap

> Read `DESIGN.md` first. This file is the **active** execution plan.
> Completed history - shipped G-series slices (through G2398), Milestones 0-6A,
> and the Road to Chrysalis 2.0 program - is archived in
> [`ROADMAP-ARCHIVE.md`](./ROADMAP-ARCHIVE.md).

Milestones are intentionally thin vertical slices: each must produce a runnable
demo and measurable numbers, not a pile of abstractions.

## Status (2026-06)

- **Releases:** `v1.0.0` -> `v2.0.x` tagged on `main`. The Chrysalis 2.0 scale-out
  milestones (`V2-M1`-`V2-M6`) are complete; see `CHANGELOG.md` and
  [`ROADMAP-ARCHIVE.md`](./ROADMAP-ARCHIVE.md).
- **v1 scope:** Milestones 0-6A complete (the closed v1 checklist - archived).
- **Active lanes:** the **Multi-lane program** baseline is **closed** (2026-06-17); **maintenance** only (new parser pages, hole-ceiling bumps). Default build queue: **`docs/STRATEGIC-PLAN.md`** § "Next 90 days" and **Hub depth** (`docs/CWL-FULLSTACK-POST-110-PROGRAM.md`).
- **Recently shipped:** **G2457–G2551** — queues **116–125** Phase C graduation (schema **198**). **G2447–G2451** queue **115**. Prior slices in [`ROADMAP-ARCHIVE.md`](./ROADMAP-ARCHIVE.md).

**Paused by policy (do not open without plan amendment):** matrix gold for
marketing; WordPress before Laravel boring; "any language production-ready" claims.

---

## Post-2.0 depth backlog (options)

**Status:** **closed (2026-06-17)** — all rows shipped or baselined; table kept for issue links and artifact pointers.

The **v2.0.0** thesis and scale-out milestones are complete; the rows below track **post-2.0 depth** work. **A, C, D, E** are **closed** in-tree; **B** ships **B0–B5.5 v16** (structural dedupe, semantic lift tiers, SQL twin oracle gates, lib-helper param inlining) — see `docs/IR-HELPER-LIFTING.md`. Broader **non-structural** helper lifting for bodies that differ beyond the B5 equivalence rules remains **maintenance / hub program** backlog (see **V2-M4** *Remaining* in [`ROADMAP-ARCHIVE.md`](./ROADMAP-ARCHIVE.md)).

| Option | What | Where it lives today | Tracking | Status |
| --- | --- | --- | --- | --- |
| **A — Full ingest checkpoint** | Persist **partial WebIR** so ingest can **resume** after crash beyond **AST parse cache** + **route shards** + merge. | **`@chrysalis/webir`** **`module-checkpoint.ts`**, **`moduleBuilderResumeFromModule`**; **`@chrysalis/ingest`** **`ingest-checkpoint.ts`** + **`ingestDirectory`** options; CLI **`--ingest-checkpoint-file`**, **`--ingest-resume-checkpoint`** (rejected with **`--merge-all-shards`**). | [#2](https://github.com/theorem6/chrysalis/issues/2) | **Closed** |
| **B — IR helper lifting** | **B1–B5.5 v16:** fixtures + **`liftSharedHelpers`** / semantic / embed / SQL twin / param-inline inlining (CLI flags; structural dedupe required). Design: **`docs/IR-HELPER-LIFTING.md`** (**D311**, **D323–D325**). | **`lift-shared-helpers.ts`**, **`library-effects.ts`**, **`merge-dedupe-key.ts`**, fixtures **`lift-helper-*`**. | [#3](https://github.com/theorem6/chrysalis/issues/3) | **Baseline closed** |
| **C — Corpus rotation + multi-host ops** | **Day-bucket** archive mover for trace roots; multi-host merge discipline unchanged (**`corpus-merge`**). | **`scripts/corpus-rotate-archive.mjs`**, **`pnpm run corpus:rotate-archive`**; **`docs/ADMINISTRATION.md`** (Corpus volume and retention). Vitest **`packages/cli/tests/corpus-rotate-archive-script.test.ts`**. | [#4](https://github.com/theorem6/chrysalis/issues/4) | **Closed** |
| **D — `rediss://` (PHP sessions)** | TLS Redis URL support in the **PHP** session bridge. | **`RedisChrysalisSessionHandler`** **`doConnectRedis`**; smoke **`packages/oracle-php/tests/redis_session_bridge_smoke.php`**. | [#5](https://github.com/theorem6/chrysalis/issues/5) | **Closed** |
| **E — Fleet / chimera dashboards** | **Reference** Grafana starter dashboard (**operator-owned** datasource). | **`examples/grafana/README.md`**, **`examples/grafana/dashboards/chrysalis-operator-overview.json`**. | [#6](https://github.com/theorem6/chrysalis/issues/6) | **Closed** |

**Multi-runtime CLI (DESIGN D295):** **Closed** — **`go/shim/`** and **`python/chrysalis_shim/`** invoke built **`packages/cli/dist/bin.js`**; CI **`pnpm run test:cli-shims`** after **`pnpm -r build`**. **`CHRYSALIS_CLI_JS`** / **`CHRYSALIS_NODE`** override discovery.


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

**Status:** **baseline closed (2026-06-17)** (DESIGN **D211**, **D2399**). Waves **0–6** shipped the parser contract, oracle probes, verify UX, and hole-economics gates. **Maintenance:** add contested-syntax pages to **`fixtures/parser-parity-probe`** when mapper gaps appear; bump **`--max-holes`** ceilings only when debt grows intentionally.

| Lane | North star | Baseline closure |
| ---- | ---------- | ---------------- |
| **A — Parser contract** | glayzzle default + **nikic** opt-in; strip-pos parity on **`fixtures/parser-parity-probe`** (~68 pages); CI nikic step + ingest parity Vitest. | **Closed** — **G2338–G2398** widening + **D270** pretest vendor. New syntax → new probe page + parity test. |
| **B — Oracle depth** | Traces as spec: **mysqli**, **laravel-shaped-db-factory**, FQN callees, redaction lockstep. | **Closed** — CI oracle smokes + **`hub-multi-lane-smoke`**. Optional strict body-proven widening deferred to hub program. |
| **C — Verify UX** | Operators act on failure: **`verify --json-summary`**, dual-backend CI gates, repair pointers, versioned JSON contracts. | **Closed** — Waves **1–5** (**D212–D231**). |
| **D — Hole economics** | One screen for debt: **`migration-debt`**, **`--json-out`**, **`--max-holes`** / **`--min-correctness`** CI gates. | **Closed** — ingest gates on **tiny-blog**, **mysqli-probe**, **laravel-shaped-db-factory-probe**, **parser-parity-probe** (ceiling **0**); **db-query-unknown-receiver-probe** (ceiling **1**, intentional negative). |

**Wave log (archived):** Wave **0** observe/redaction; **1–2** mysqli + migration-debt; **3** PDO + parser-parity-probe; **4** verify JSON + factory callees; **5** dual-summary CI; **6** WPTP/hub smokes (**D309**). Full lane table history in git before **G2399** trim; slice IDs **G213–G2398** in [`ROADMAP-ARCHIVE.md`](./ROADMAP-ARCHIVE.md).

### Commercial program (documentation + optional CLI gate)

**Status:** **Baseline closed (2026-06-17)** — in-tree scaffolding on **`main`** (**DESIGN D289**). **`chrysalis init`** is **not** license-gated (**D290**). **Not yet published** as a public commercial launch (no SKUs/pricing). **Purpose:** **`docs/COMMERCIAL.md`** revenue ordering + **`@chrysalis/license`** / **`chrysalis license`** / **`CHRYSALIS_REQUIRE_LICENSE`** for future vendor distributions. **Non-goals in-tree:** payment processors, activation servers, metering.


---

## What's next (active backlog)

The default implementation queue is **`docs/STRATEGIC-PLAN.md`** § "Next 90 days"
(see `AGENTS.md`). **Closed programs** (do not reopen without plan amendment): multi-lane Waves **0–6**, post-2.0 options **A–E**, hub verify-gaps months **26–30**, post–queue **110** Phases **A+B**. Current build focus:

- **CWL / full-stack:** queues **111–125 complete** (schema **198**) — **`docs/CWL-FULLSTACK-QUEUES-111-120.md`**, **`docs/CWL-FULLSTACK-QUEUES-121-130.md`**; queue **126+** requires charter amendment.
- **Parser maintenance:** contested-syntax pages in **`fixtures/parser-parity-probe`** when mapper gaps appear.
- **Hole economics maintenance:** **`db-query-unknown-receiver-probe`** remains the intentional **1-hole** negative probe; add new tracked DB receivers via **mysqli-probe** routes when widening **`->query`** lowering.
- **IR helper lifting maintenance:** hub-gated B5.x patterns only (`docs/IR-HELPER-LIFTING.md`).

Everything already shipped is logged in [`ROADMAP-ARCHIVE.md`](./ROADMAP-ARCHIVE.md).

