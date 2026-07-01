# AGENTS.md — Instructions for AI assistants working on Chrysalis

**You are building a specific thing. Do not drift.**

## 0. Before you do anything

1. Read `DESIGN.md` in full. It is the north star for architecture and invariants.
2. Read **`docs/STRATEGIC-PLAN.md` in full. It is the **locked path** for what to build, in what order, and what to refuse. **Do not deviate** from it unless the user explicitly amends the plan (`DESIGN.md` Decision Log + edit `STRATEGIC-PLAN.md`).
3. Read `ROADMAP.md` for **status** and the **active build queue** (`docs/STRATEGIC-PLAN.md` §12; index: [`docs/MIGRATION-OS.md`](docs/MIGRATION-OS.md)). Completed history is in **`ROADMAP-ARCHIVE.md`**. Maintenance and closed programs: [`docs/PAUSED-AND-MAINTENANCE.md`](docs/PAUSED-AND-MAINTENANCE.md).
4. Read the `README.md` of the specific package you're about to touch.
5. For **install / operations / administration / releases**, see **`docs/`** (index: [`docs/README.md`](docs/README.md); **operator stack:** [`docs/MIGRATION-OS.md`](docs/MIGRATION-OS.md)).
6. If your plan contradicts `DESIGN.md`, do one of two things:
   - **Change `DESIGN.md` first**, with a new entry in the Decision Log section, or
   - **Change your plan**.
   Never silently drift.
7. If your plan contradicts **`docs/STRATEGIC-PLAN.md`**, treat that as drift unless the user is **explicitly** amending the strategic plan (not merely asking a question).

### Strategic path (locked) — interaction rules

The user may lock strategy in conversation. Unless they **explicitly** amend it:

| They say | You do |
| --- | --- |
| “Build / implement / add / fix …” | Work that fits **`STRATEGIC-PLAN.md`** phases and priorities (still obey `DESIGN.md`) |
| “What if …”, “Should we …”, “Can we …”, “Why …”, “Explain …” | **Clarify** against the strategic plan; map to phase/tier; **do not implement a fork** |
| “Also …” without a build verb | Assume **clarification** unless they clearly command implementation |
| “Ignore the plan and …” | Refuse off-plan implementation; offer to amend the plan formally if they want a new direction |

**Close before build:** A phase (or phase slice) is not **active for new implementation** until its **close gate** passes and status docs mark it **closed**. Do not start the next queue on scaffolding alone.

**North star vs POC:** **CWL** (final web language) is authoritative; **WISP** exists solely to **showcase** CWL — prioritize generalizable language/engine wins over WISP-only convenience. **GenieACS is WISPTools legacy — not Chrysalis POC scope** (**D6205**).

**Default implementation queue** when build scope is unclear: [`docs/STRATEGIC-PLAN.md`](docs/STRATEGIC-PLAN.md) §12 and [`docs/MIGRATION-OS.md`](docs/MIGRATION-OS.md). Historical programs: [`docs/archive/INDEX.md`](docs/archive/INDEX.md).

## 1. The project is Chrysalis, not "a PHP-to-TS converter"

The converter is the adoption vector for the framework. When in doubt, the
framework wins. Examples:

- A quick feature that helps one-shot conversion but makes dual-stack harder → **no**.
- A shortcut that produces TS without going through WebIR → **no**.
- A dependency that makes `webir` non-portable → **no**.

## 2. The non-negotiables (see `DESIGN.md § 3`)

If you find yourself doing any of these, stop:

1. Emitting code that hasn't been validated against the oracle in any form.
2. Producing generated types without provenance.
3. Hardcoding against a single emit backend in `webir`, `ingest`, `verify`, or `cli`.
4. Introducing a circular dependency between packages.
5. Making `compat` the default output instead of a fallback.
6. Papering over an unsupported construct with silent best-effort translation —
   use a hole.
7. Adding a function-level PHP↔TS FFI mechanism.
8. Reading from `Date.now()`, `Math.random()`, `process.env`, or the real
   network inside generated handlers or verify sandboxes. Use the injected
   context (`ctx.time`, `ctx.random`, etc.).

## 3. How to add a feature

1. Find or write the milestone item in `ROADMAP.md` that covers it.
2. Identify which package owns it. If none do, the feature is probably
   mis-scoped — ask first.
3. Write the types and IR changes *before* the passes that use them.
4. Every new WebIR node needs: `id`, `type`, `effects`, `provenance`, `origin`.
5. Every new pass needs a test fixture under `fixtures/` with a golden snapshot.
6. If the feature affects generated code, it must include a trace-based
   verification test, not just unit tests.

## 4. How to deal with an unsupported PHP construct

- Emit a **hole**. Do not throw, do not best-guess, do not comment-out.
- Register the hole in the report with a descriptive name (`legacy:<reason>`).
- Add a fixture that triggers the hole.
- Add a ROADMAP item if the construct should be supported later.

## 5. Style and ergonomics

- TypeScript strict mode, everywhere. No `any` without a `// FIXME: …` note.
- Package READMEs state: *purpose, public API, invariants, non-goals*. Keep
  those four headings.
- Vitest **`packages/cli/tests/*`** subprocesses load workspace packages from each
  package’s **`dist/`** (e.g. **`@chrysalis/verify`**). After changing a package’s
  **exported** API surface, run **`pnpm --filter <pkg> build`** or **`pnpm -r build`**
  before expecting those CLI tests to pass locally.
- No proactive new files. If a change fits in an existing file, keep it there.
- No emojis in code or generated output.
- Keep commit messages descriptive; group by package.

### Local `ci-gates`

- **`pnpm run test:cli-shims`** — smoke **`go run ./go/shim`** and **`python -m chrysalis_shim`** against the built **`packages/cli/dist/bin.js`** (**DESIGN D295**). **`typecheck-and-test`** (`.github/workflows/ci.yml`) runs it after **`pnpm -r build`** with **`actions/setup-go@v5`** (**Go 1.22**); **`ubuntu-latest`** provides **`python3`**. On **`GITHUB_ACTIONS`**, the script is **strict** (both shims required). Locally set **`CHRYSALIS_STRICT_CLI_SHIMS=1`** for the same bar.
- **Phase 8 product proof:** **`pnpm run test:gce:phase8-strict`** (GCE/Linux only — do not run strict close smoke on Windows). Detached on **`chrysalis-test-vm`** with **`CHRYSALIS_STRICT_STRATEGIC_PLAN=1`**. Status: **`pnpm run test:gce:phase8-strict:status`**. Full suite also runs phase 8 when **`CHRYSALIS_GCE_PHASE8_STRICT=1`** (default). Vitest **`hub-strategic-plan-phase8.test.ts`** uses explicit skips locally.
- Root **`pnpm run ci:*`** scripts invoke **`scripts/ci-gates.mjs`** with consistent missing-file / invalid-JSON stderr (**`readJsonGateArtifact`**, **`DESIGN` D231**). Includes **`ci:corpus-merge-summary`** for **`chrysalis.corpus-merge.summary`** artifacts (**`fixtures/ci/corpus-merge-summary-smoke.json`** in **`typecheck-and-test`**). Vitest also covers missing file, invalid JSON, wrong **`kind`**, and **`schemaVersion`** drift (**`packages/cli/tests/ci-gates-json-artifacts.test.ts`**, **`ci-gates-corpus-merge-summary.test.ts`**). Shard merge: **`mergeWebIrModules`** (**`@chrysalis/webir`**, cross-shard structural dedupe **D247** / **`merge-dedupe-key.ts`**) + CLI **`--merge-all-shards --shard-count K`** on **`ingest` / `emit` / `status`** (**DESIGN** D246–D247). **`chrysalis status --json`** exposes **`ingestSharding`** (**D248**). Subprocess coverage: **`merge-all-shards-*`**, **`route-shard-status-cli.test.ts`**. Flagship **`emit-stats`** **`layout`** (**`summarizeEmittedTypeScriptLayout`**, **D250**).
- **`pnpm run ci:insight`** runs **`chrysalis insight`** then **`tiny-n1-insight`**; use **`pnpm run ci:tiny-n1-insight`** when the insight JSON artifact already exists.
- **`pnpm run ci:migration-sidecar-floors`** no-ops (exit **0**, skip log) unless **`CHRYSALIS_IDIOMATICITY_MIN`** and/or **`CHRYSALIS_RESIDUAL_LEGACY_MAX`** are set; coverage is in **`packages/cli/tests/ci-gates-json-artifacts.test.ts`**.
- **`pnpm run ci:emit-layout-floors`** no-ops unless **`CHRYSALIS_EMIT_LAYOUT_MAX_HONO_*`** and/or **`CHRYSALIS_EMIT_LAYOUT_MAX_FASTIFY_*`** are set (**`emit-layout-floors`**, **D251**); same Vitest file.
- **Default long test runs:** **`pnpm run test:gce`** uploads local **`git HEAD`**, syncs runner scripts, and starts **`scripts/gce-run-all-tests.sh`** detached on **`chrysalis-test-vm`** (see **`docs/GCE-LOCAL-VERIFY.md`**). Includes **G8560** IS close and **G8550** / **G8290** / **G8310** Migration OS smokes. Fast slice: **`pnpm run test:gce:migration-os`**. **`pnpm run test:gce:status`** / **`test:gce:fetch`**. Optional full workspace Vitest: **`.\scripts\gce-run-all-tests.ps1 -FullVitest -Detach`**.

### Commercial CLI license (**DESIGN D289**)

Optional vendor gate: **`CHRYSALIS_REQUIRE_LICENSE`**, **`CHRYSALIS_LICENSE_MIN_TIER`**, **`chrysalis license`**. Commands **`license`** and **`init`** are **not** gated (bootstrap / key checks). Package **`@chrysalis/license`** — after changing its **exported** API, **`pnpm --filter @chrysalis/license build`** (same rule as other packages). **`pnpm run license:sign`** runs **`scripts/sign-license.mjs`** against **built** **`packages/license/dist/`**. Playbook and **publication status**: **`docs/COMMERCIAL.md`**.

### Oracle-php redaction lockstep

If you touch **`packages/oracle/src/redaction.ts`** (`DEFAULT_REDACTION`) or
**`packages/oracle-php/src/Redactor.php`**, keep paths and semantics aligned and run
**`pnpm run test:oracle-php-redactor`** with PHP on `PATH` before pushing. CI also runs
those smoke tests in **`typecheck-and-test`**, **`oracle-live-drive`**, and **`verify-e2e`**
(plus flagship verify jobs). If you touch **`packages/oracle-php/src/Session/`** or session
bridge semantics, run **`pnpm run test:oracle-php-session-redis`** with **`CHRYSALIS_SESSION_REDIS_URL`**
and **phpredis** when possible; CI **`typecheck-and-test`** runs that script against a Redis **7**
service with the **redis** PHP extension.

### Parser-bridge vendor (nikic Vitest)

**`pnpm test`** runs **`pretest`** (**`scripts/ensure-parser-bridge-vendor.mjs`**) so **`packages/parser-bridge/vendor/`** is created: **`composer`** on **`PATH`** if available, else **`scripts/parser-bridge-composer-install.mjs`** bootstraps **`composer.phar`** when **`php`** is runnable (**DESIGN D270**). CI **`typecheck-and-test`** relies on this (no separate global Composer step). **`tests/nikic.test.ts`** and ingest’s **`parser-provider=nikic`** parity case still need **`php`** on **`PATH`**. Skip the hook with **`CHRYSALIS_SKIP_PARSER_VENDOR=1`**, or run **`pnpm exec vitest run`** to bypass **`pretest`**. Manual install: **`pnpm run vendor:parser-bridge`**.

## 6. What to show the human

At the end of any non-trivial change, report:

- Which `DESIGN.md` principles the change upholds
- Which `ROADMAP.md` item it advances (or creates)
- What the correctness / coverage / idiomaticity impact is (if measurable)
- Any holes added or closed

## 7. When the user asks for "something new"

Before starting:

1. Check if the request is already covered in `DESIGN.md` or `ROADMAP.md`.
2. If yes, point to it and proceed.
3. If no, propose the addition as a Decision Log entry *first*, get approval,
   then implement.

The goal is that a year from now, a stranger reading `DESIGN.md` and this file
can understand the whole system and contribute without re-litigating the
architecture.

## 8. Optional: Cursor and the agent cookbook

If you use **Cursor**, the project includes **`.cursor/rules/chrysalis.mdc`**
(`alwaysApply: true`) so Composer / Agent sessions load Chrysalis baseline
instructions alongside Cursor’s own harness.

For **how to work with agents in Cursor** (prompts, context limits, scope,
failure patterns), use Cursor’s cookbook, starting with
[Working with agents](https://cursor.com/docs/cookbook/agent-workflows).
That material is an **optional** productivity layer: it does not override
`DESIGN.md`, `ROADMAP.md`, or the rules in sections 1–7 above.
