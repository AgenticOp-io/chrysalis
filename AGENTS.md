# AGENTS.md — Instructions for AI assistants working on Chrysalis

**You are building a specific thing. Do not drift.**

## 0. Before you do anything

1. Read `DESIGN.md` in full. It is the north star.
2. Read `ROADMAP.md` to know which milestone is active.
3. Read the `README.md` of the specific package you're about to touch.
4. If your plan contradicts `DESIGN.md`, do one of two things:
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
- No proactive new files. If a change fits in an existing file, keep it there.
- No emojis in code or generated output.
- Keep commit messages descriptive; group by package.

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
