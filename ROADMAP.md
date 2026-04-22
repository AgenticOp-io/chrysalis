# Chrysalis — Roadmap

> Read `DESIGN.md` first. This file is the execution plan for that design.

Milestones are intentionally thin vertical slices. Each milestone must produce a
runnable demo and measurable numbers, not a pile of abstractions.

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

**Status: translation axis is live (2, 3, 5, 8). Oracle (1) recording side is
implemented; remaining work is the corpus-driven loop (4, 6, 7).**
The unmodified tiny-blog PHP app is ingested into a 326-node WebIR module
with zero holes; emit-hono produces a compiling TypeScript project that
serves live HTTP requests against a seeded SQLite database. The Oracle PHP
prelude captures HTTP + SQL + session traces into a versioned NDJSON
corpus; `chrysalis observe` wires it up; `chrysalis corpus` summarizes it.

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
   - [ ] Reads the DB schema from the fixture's MySQL/SQLite
   - [ ] Extracts form field structure from the PHP templates
   - [ ] Intersects with observed JSON shapes from the trace corpus
   - [ ] Emits `Post`, `User`, `Comment` types with `@chrysalis-provenance` JSDoc

5. **Emit (Hono + SQLite)**
   - [x] Produces a runnable project (Hono + `node:sqlite`)
   - [x] Routes mirror the PHP URL structure
   - [x] Handlers carry `@chrysalis-effects` annotations derived from WebIR
   - [x] At least one deliberately-unsupported node appears as a compiling
         hole (none needed for tiny-blog; the infrastructure exists and is
         exercised on synthetic inputs in tests).
   - [ ] Migrate to Drizzle (currently emits hand-rolled SQL for Milestone 1).

6. **Verify (replay oracle)**
   - [ ] Runs every captured trace against the generated handlers in a sandbox
   - [ ] Injects deterministic time/RNG and recorded SQL results
   - [ ] Diffs effects + response per trace
   - [ ] Produces `reports/<endpoint>.json` with a numeric correctness score
   - [ ] Attributes each divergence to specific WebIR node IDs

7. **Runtime chimera (dual-stack)**
   - [ ] A Node-based proxy routes per-path to either PHP or the new stack
   - [ ] Supports modes: `legacy`, `shadow`, `cutover`
   - [ ] Shadow mode logs diffs in the same format as `verify`
   - [ ] Session bridge: PHP `$_SESSION` and new-stack session see the same store
         (provisionally Redis; SQLite fallback acceptable for demo)

8. **CLI dashboard**
   - [x] `chrysalis ingest <dir>` prints route/node/hole counts and dialect totals
   - [x] `chrysalis emit <dir> --out <dir> [--target=hono]` generates the project
         and reports per-handler effects
   - [x] `chrysalis observe <dir>` starts the live recorder
   - [x] `chrysalis corpus <dir>` summarizes a traces directory
   - [ ] `chrysalis status` prints:
     - Coverage %
     - Correctness % (per endpoint and aggregate)
     - Hole count with status/owner
     - Residual legacy % (from chimera router)

**Definition of done:** a demo recording that walks from an unmodified PHP
tiny-blog, through `observe → ingest → emit → verify → cutover`, with live
metrics, in under 10 minutes.

---

## Milestone 2 — Expansion (4–6 weeks)

Deepen each layer without broadening too fast.

- [ ] Second emit backend: `emit-fastify` (proves WebIR target-portability)
- [ ] Effect inference: automatic widening/narrowing of effect sets across calls
- [ ] Intent-preserving rewrites (v1):
  - `foreach` accumulator → `.map`/`.reduce`/loop chooser
  - Inline `$_POST` validation → Zod schema at route boundary
  - N+1 detection → batched loader (flagged in report; not auto-applied yet)
- [ ] Archaeology v2: infer enum types from observed traces + DB CHECK constraints
- [ ] Oracle: outbound HTTP + mail recording
- [ ] CI: fixture suite with golden WebIR snapshots and golden generated TS
- [ ] Chimera: canary mode with percentage routing + user-hash stickiness

---

## Milestone 3 — Repair loop (4–6 weeks)

Close the LLM-verified feedback loop.

- [ ] Divergence attribution is precise enough to localize to ≤5 IR nodes per failure
- [ ] Repair pass interface: given a `DivergenceReport` and the local IR, an
      agent proposes an IR patch
- [ ] Patches are **always** re-verified before acceptance; never trusted
- [ ] CLI: `chrysalis repair <endpoint>` loop with bounded iterations and cost
- [ ] Proposed patches are committed as IR diffs with rationale in provenance
- [ ] Hole auto-closure: when a hole's enclosing traces pass verification with a
      candidate translation, the hole is closed with human sign-off

---

## Milestone 4 — First real app (open-ended)

Pick a flagship open-source PHP app and migrate it end-to-end in public.

Candidates (in rough order of tractability):
1. A small Laravel blog or starter kit
2. osTicket
3. phpBB (hard; good stress test)
4. WordPress — **not yet.** WordPress needs its own design spike because of
   the plugin ecosystem, `wp_*` globals, and the hook/filter model.

Success looks like: a public migration dashboard for the chosen app, with
Coverage / Correctness / Idiomaticity / Residual-Legacy numbers updated on
every commit.

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
