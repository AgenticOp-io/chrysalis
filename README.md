# Chrysalis

> A web framework you can grow *inside* a legacy PHP app until it consumes it.

Chrysalis turns legacy modernization from a **translation problem** into a
**specification problem**: your running app becomes the spec, and translated
code is verified against its real behavior — not trusted on faith.

It converts PHP to modern TypeScript, but that's only one of its three legs:

1. **WebIR** — a multi-dialect, typed, effect-aware intermediate representation
   for web applications. Frontends ingest any legacy language; backends emit
   any modern stack.
2. **Oracle** — a record/replay system. A sidecar captures your PHP app's
   real traffic, SQL, and side effects; the replay engine verifies every
   translated endpoint against those captures.
3. **Chimera runtime** — a dual-stack coexistence layer. PHP and the new
   TypeScript stack run side-by-side behind one router, sharing sessions and
   the database, so you migrate one endpoint at a time with live production
   traffic as your test suite.

## Status

**Pre-alpha.** **Milestone 1 is closed** (tiny-blog vertical slice: ingest →
WebIR → emit-hono, Oracle, verify, archaeology including optional PHP form scan,
chimera `legacy` / `cutover` / `shadow` / **`canary`**, `chrysalis status`).

**Milestone 2 — Expansion is closed** (emit-fastify, insight, rewrite catalog
including `dispatch-union-zod` for string dispatch, `call_user_func` effect
widening, nested lib/route function bodies in the call map, `batch-n1-read`
including `SELECT *`, dual-stack verify, canary chimera). See `ROADMAP.md` for
explicit post-M2 deferrals (vendor Composer, `mysqli` oracle shim, bare inner
N+1 without assign).

**Current engineering focus: Milestone 4 — First real app** (flagship Laravel
pilot, wider corpus, monotonic migration metrics on `main`). Milestone 3 repair
loop (verify-gated `chrysalis repair`, optional LLM, hole patches) is closed for
v1; emit↔IR maps and richer attribution remain cross-cutting.

**Milestone 4** (first real flagship app) is underway in parallel: `flagship/laravel-min`
is a Laravel-shaped ingest/emit slice (see `flagship/README.md`). `chrysalis
status --json` exposes a `migration` object for coverage, correctness, and
optional sidecars; full Composer Laravel remains the next expansion.

The end-to-end translation pipeline runs on the bundled `fixtures/tiny-blog`
PHP app: PHP sources → parser-bridge → WebIR → emit-hono → a compiling
TypeScript project that passes `tsc --noEmit` *and* actually serves live HTTP
traffic backed by SQLite (no holes emitted for this fixture). The same WebIR
module typechecks as **Hono** or **Fastify** (`chrysalis emit --target=…`).
CI replays the oracle corpus in-process against both stacks. Emit also
lowers **string-dispatch** if/elseif chains to a TypeScript `switch` when
they match the same structural rules as `@chrysalis/insight` (see D21 in
`DESIGN.md`).

The Oracle's **recording** half is live: a userland PHP prelude
(`packages/oracle-php/`) captures HTTP requests, SQL queries, session state,
headers, and cookies into a versioned NDJSON corpus, with configurable
capture-time redaction. Driven by `chrysalis observe`, read back by
`chrysalis corpus`.

The **verify** loop is live: `chrysalis verify` replays the captured corpus
against the emitted app over HTTP, with ordered cookie-chaining, normalizes
clock-derived nondeterminism (timestamps, session ids, UUIDs), scores each
endpoint with Jaccard body similarity, and writes per-route reports under
`reports/verify/summary.json` (or per-backend `hono/` / `fastify/` after dual
verify). An end-to-end CI job drives PHP → captures the corpus → dual emit →
in-process replay → enforces a correctness threshold on **each** emitter.
Locally: `pnpm run verify:e2e` (tiny-blog) and `pnpm run verify:flagship`
(flagship `laravel-min`; requires PHP on PATH).

Archaeology runs as part of the emit pipeline: it reads the fixture's
`schema.sql`, intersects it with any observed trace shapes, and writes
`generated/tiny-blog/src/domain.ts` with `@chrysalis-provenance` JSDoc on
every entity and field (including `status` as a `"draft" | "published" |
"archived"` string-literal union, derived from the DDL's `CHECK IN`).

The **chimera runtime** proxy is live: `chrysalis deploy` runs a per-path
reverse proxy over both stacks with `legacy` / `cutover` / `shadow` / `canary`
modes. **Canary** applies the same rules as cutover but sends only a configured
percentage of modern-eligible traffic to the new stack, with deterministic
cookie/header/IP stickiness. In shadow mode, every request hits legacy (response
returned to client) and is mirrored to the modern stack in the background;
responses are diffed with the same `@chrysalis/verify` primitive used for replay,
and divergences are appended to `reports/shadow/shadow.ndjson`.

The **status dashboard** (`chrysalis status`) composes all of the above into
one view: corpus size, per-endpoint correctness, archaeology coverage,
shadow-mode agreement, and residual PHP (hole count + IR dialect totals). Run
with `--json` for machine-readable output.

**Remaining polish for Milestone 1:** session bridge for chimera (PHP
`$_SESSION` ↔ new-stack session store). Row-level generics from archaeology
are wired when `domainTypesByTable` is passed (see D22 in [`DESIGN.md`](./DESIGN.md)).
See [`ROADMAP.md`](./ROADMAP.md).

## Read these first

- [`DESIGN.md`](./DESIGN.md) — the north-star architecture and principles.
  **Do not skip.**
- [`ROADMAP.md`](./ROADMAP.md) — staged milestones with acceptance criteria.
- [`AGENTS.md`](./AGENTS.md) — rules for humans and AI assistants contributing
  code. The project has strong anti-drift rules; please respect them.

## Quick start

```bash
pnpm install
pnpm -r build
pnpm test
node scripts/run-e2e.mjs            # ingest + emit the tiny-blog fixture
node scripts/seed-db.mjs            # create generated/tiny-blog/blog.sqlite
cd generated/tiny-blog
npm install
npx tsc --noEmit                    # typecheck the emitted project
npx tsx src/index.ts                # serve on :3000
```

CLI equivalents:

```bash
node packages/cli/dist/bin.js ingest fixtures/tiny-blog
node packages/cli/dist/bin.js emit fixtures/tiny-blog --out generated/tiny-blog --target=hono
node packages/cli/dist/bin.js emit fixtures/tiny-blog --out generated/tiny-blog-fastify --target=fastify
```

Record a trace corpus from the live PHP app (requires `php` on PATH):

```bash
node packages/cli/dist/bin.js observe fixtures/tiny-blog --traces traces --port 8080
# in another terminal:
curl http://127.0.0.1:8080/
node packages/cli/dist/bin.js corpus traces
# or do both at once, one request per route:
node scripts/drive-tiny-blog.mjs
```

Run the full verify loop (drive PHP → emit → replay → score):

```bash
node scripts/verify-tiny-blog.mjs
# produces reports/verify/summary.json and one file per route.
```

Or point `chrysalis verify` at an already-running emitted app:

```bash
node packages/cli/dist/bin.js verify traces \
  --base-url http://127.0.0.1:3000 \
  --threshold 0.8 \
  --report reports/verify
```

Run archaeology standalone:

```bash
node packages/cli/dist/bin.js archaeology fixtures/tiny-blog/schema.sql \
  --traces traces \
  --out generated/tiny-blog/src/domain.ts
```

Run both stacks behind the chimera proxy (assumes PHP on :18080 and the
emitted app on :3000):

```bash
# shadow mode: legacy answers the client, modern is mirrored and diffed.
node packages/cli/dist/bin.js deploy \
  --mode=shadow \
  --legacy http://127.0.0.1:18080 \
  --modern http://127.0.0.1:3000 \
  --port 8080 \
  --shadow-log-dir reports/shadow

# cutover mode with a route file:
node packages/cli/dist/bin.js deploy --mode=cutover \
  --legacy http://127.0.0.1:18080 --modern http://127.0.0.1:3000 \
  --config chimera.json
```

Catalog legacy anti-patterns on the IR (N+1 queries, scattered input
validation, string-based dispatch). Corpus boosts confidence on patterns
the runtime actually exhibited:

```bash
node packages/cli/dist/bin.js insight fixtures/tiny-n1
# or write a machine-readable report:
node packages/cli/dist/bin.js insight fixtures/tiny-blog \
  --traces traces --out reports/insight/opportunities.json --json
```

See the overall migration status (renders tables from the files the earlier
stages wrote; pass `--json` for a machine-readable summary):

```bash
node packages/cli/dist/bin.js status \
  --traces traces \
  --schema fixtures/tiny-blog/schema.sql \
  --report reports/verify \
  --shadow reports/shadow \
  --project fixtures/tiny-blog
```

## Why another converter?

Because every existing one reads your source code and hopes. Chrysalis reads
your source code, your database, your forms, and your live traffic, compares
the result against what your app actually does, and refuses to lie to you
about correctness. Partial output is fine — silent wrong output is not.

See `DESIGN.md § 2` for the full argument.

## License

MIT (planned).
