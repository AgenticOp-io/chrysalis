# AGENTS.md — Instructions for AI assistants working on Chrysalis

**You are building a specific thing. Do not drift.**

## 0. Before you do anything

1. Read `DESIGN.md` in full. It is the north star.
2. Read `ROADMAP.md` to know which milestone is active (file header; **Milestone 5** for flagship depth; Milestone 4 remains the closed v1 checklist). For cross-cutting parser/oracle/verify/hole work, see **“Multi-lane program”** near the end of `ROADMAP.md` (**DESIGN D211**).
3. Read the `README.md` of the specific package you're about to touch.
4. For **install / operations / administration / releases / GitHub Project planning**, see **`docs/`** (index: `docs/README.md`; GitHub Project: `docs/GITHUB_PROJECT.md`) in addition to the root `README.md`.
5. If your plan contradicts `DESIGN.md`, do one of two things:
   - **Change `DESIGN.md` first**, with a new entry in the Decision Log section, or
   - **Change your plan**.
   Never silently drift.

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

- Root **`pnpm run ci:*`** scripts invoke **`scripts/ci-gates.mjs`** with consistent missing-file / invalid-JSON stderr (**`readJsonGateArtifact`**, **`DESIGN` D231**).
- **`pnpm run ci:insight`** runs **`chrysalis insight`** then **`tiny-n1-insight`**; use **`pnpm run ci:tiny-n1-insight`** when the insight JSON artifact already exists.
- **`pnpm run ci:migration-sidecar-floors`** no-ops (exit **0**, skip log) unless **`CHRYSALIS_IDIOMATICITY_MIN`** and/or **`CHRYSALIS_RESIDUAL_LEGACY_MAX`** are set; coverage is in **`packages/cli/tests/ci-gates-json-artifacts.test.ts`**.

### Oracle-php redaction lockstep

If you touch **`packages/oracle/src/redaction.ts`** (`DEFAULT_REDACTION`) or
**`packages/oracle-php/src/Redactor.php`**, keep paths and semantics aligned and run
**`pnpm run test:oracle-php-redactor`** with PHP on `PATH` before pushing. CI also runs
those smoke tests in **`typecheck-and-test`**, **`oracle-live-drive`**, and **`verify-e2e`**
(plus flagship verify jobs).

### Parser-bridge vendor (nikic Vitest)

**`pnpm test`** runs **`pretest`** (**`scripts/ensure-parser-bridge-vendor.mjs`**) so **`packages/parser-bridge/vendor/`** is created when Composer is runnable; CI **`typecheck-and-test`** relies on this (no separate Composer step). **`tests/nikic.test.ts`** and ingest’s **`parser-provider=nikic`** parity case still need **`php`** on **`PATH`**. Skip the hook with **`CHRYSALIS_SKIP_PARSER_VENDOR=1`**, or run **`pnpm exec vitest run`** to bypass **`pretest`**. Manual install: **`pnpm run vendor:parser-bridge`**.

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
