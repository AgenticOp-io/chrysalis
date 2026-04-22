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

**Pre-alpha. Milestone 1: translation axis + Oracle recording + replay-side
verify + archaeology are online.**

The end-to-end translation pipeline runs on the bundled `fixtures/tiny-blog`
PHP app: PHP sources → parser-bridge → WebIR → emit-hono → a compiling
TypeScript project that passes `tsc --noEmit` *and* actually serves live HTTP
traffic backed by SQLite (no holes emitted for this fixture).

The Oracle's **recording** half is live: a userland PHP prelude
(`packages/oracle-php/`) captures HTTP requests, SQL queries, session state,
headers, and cookies into a versioned NDJSON corpus, with configurable
capture-time redaction. Driven by `chrysalis observe`, read back by
`chrysalis corpus`.

The **verify** loop is live: `chrysalis verify` replays the captured corpus
against the emitted app over HTTP, with ordered cookie-chaining, normalizes
clock-derived nondeterminism (timestamps, session ids, UUIDs), scores each
endpoint with Jaccard body similarity, and writes per-route reports under
`reports/verify/`. An end-to-end CI job drives PHP → captures the corpus →
emits the TypeScript stack → replays → enforces a correctness threshold.

Archaeology runs as part of the emit pipeline: it reads the fixture's
`schema.sql`, intersects it with any observed trace shapes, and writes
`generated/tiny-blog/src/domain.ts` with `@chrysalis-provenance` JSDoc on
every entity and field (including `status` as a `"draft" | "published" |
"archived"` string-literal union, derived from the DDL's `CHECK IN`).

**Remaining for Milestone 1:** the chimera runtime proxy and the
`chrysalis status` dashboard. See [`ROADMAP.md`](./ROADMAP.md).

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

## Why another converter?

Because every existing one reads your source code and hopes. Chrysalis reads
your source code, your database, your forms, and your live traffic, compares
the result against what your app actually does, and refuses to lie to you
about correctness. Partial output is fine — silent wrong output is not.

See `DESIGN.md § 2` for the full argument.

## License

MIT (planned).
