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

**Latest tagged source release: v1.0.1** (see [`CHANGELOG.md`](./CHANGELOG.md) and [GitHub Releases](https://github.com/theorem6/chrysalis/releases)). Install from a tarball: [`docs/INSTALLATION.md`](./docs/INSTALLATION.md#installing-from-a-release-tarball). The repo remains a **fast-moving monorepo**: milestones through **6A** (scoped) are complete per [`ROADMAP.md`](./ROADMAP.md); cross-cutting parser, oracle, verify depth, and optional repair work continue on `main`.

**Milestone 1 is closed** (tiny-blog vertical slice: ingest →
WebIR → emit-hono, Oracle, verify, archaeology including optional PHP form scan,
chimera `legacy` / `cutover` / `shadow` / **`canary`**, `chrysalis status`).

**Milestone 2 — Expansion is closed** (emit-fastify, insight, rewrite catalog
including `dispatch-union-zod` for string dispatch, `call_user_func` effect
widening, nested lib/route function bodies in the call map, `batch-n1-read`
including `SELECT *`, dual-stack verify, canary chimera). See `ROADMAP.md` for
explicit post-M2 deferrals (vendor Composer, raw `mysqli` call lowering without helpers, bare inner
N+1 without assign).

**Milestone 4 v1 pilot is closed** (2026-04-25): flagship **Laravel-shaped** (`flagship/laravel-min`)
and **Composer adoption templates** (`flagship/laravel-full`) meet the phased acceptance in
`ROADMAP.md` — ingest/emit **zero holes** on committed manifests, oracle + dual verify in CI where
scripted, migration + oracle-footprint artifacts, and `chrysalis status --json` inputs documented in
`flagship/README.md`. **Milestone 5** and **Milestone 6 / 6A** scoped checklists are **complete** (see **`ROADMAP.md`**); ongoing work is cross-cutting (parser surface, verify depth, migration sidecars).
**Decision D122:** `flagship/laravel-min` remains the permanent fast regression fixture; Breeze
first-party auth UI and production auth internals stay outside owned parity scope until a dedicated milestone.
Milestone 3 repair loop (verify-gated `chrysalis repair`, optional LLM, hole patches) is closed for v1;
emit↔IR maps and richer attribution remain cross-cutting.

**Flagship snapshot:** `flagship/laravel-min` carries **Composer autoload**, **SQLite** routes
(**`/items`**, **`/count`**, **`/hello`**, **`POST /echo`**, **`/session/visit`**, **`/api/health`**, metadata
**`GET`**s, **`/jump`**, fixture **login/logout/me**), **`verify:flagship`**, and
**`status:laravel-min`** (migration gate + optional sidecars after verify).
**`flagship/laravel-full`** ships **`chrysalis-templates/`** (17 bounded template routes),
**`pnpm run scaffold:laravel-full`**, and optional **`verify:laravel-full`** /
**`status:laravel-full`** when **`chrysalis-laravel-work`** exists
(see `flagship/laravel-full/README.md`). Stress replay gate:
**`verify:laravel-full:stress`**. Seed-variant matrix gate:
**`verify:laravel-full:seed-matrix`** (baseline/empty/ten). Five-nines confidence gate:
**`verify:laravel-full:5nines`** (includes rolling `confidence-trend`).

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

**Machine-readable JSON (CI and dashboards):**

| Source | Contract | Notes |
| --- | --- | --- |
| `chrysalis status --json` | Human-oriented status object; **not** version-tagged as a schema — treat keys as stable within a release, not forever. | Requires `--project` for residual-legacy / migration slices. Optional `reports/migration/*.json` sidecars. |
| `chrysalis verify … --json-summary` | **`kind`: `"chrysalis.verify.summary"`**, **`schemaVersion`**: `1`, **`toolVersion`**: repo root version. | One JSON object on **stdout**; progress on **stderr**. See `packages/verify/README.md` and `packages/cli/README.md`. |
| `scripts/verify-*.mjs` dual-backend CI summaries | **`kind`: `"chrysalis.verify.summary.dual"`**, **`schemaVersion`**: `1`, **`toolVersion`**: repo root version. | Written under `reports/ci/verify-e2e-summary.json`, `reports/ci/verify-flagship-laravel-min-summary.json`, `reports/ci/verify-flagship-laravel-full-summary.json`. Run **`pnpm run ci:verify-dual-summary`** (defaults to `reports/ci/verify-e2e-summary.json`) or **`pnpm run ci:verify-dual-summary -- <path>`** to invoke `scripts/ci-gates.mjs verify-dual-summary`. |
| Partitioned verify merged summary (V2-M1) | **`kind`: `"chrysalis.verify.summary.merged"`**, **`schemaVersion`**: `1`. | **`verify-tiny-blog.mjs`** writes `reports/ci/verify-e2e-merged-summary.json`. Fixture: **`fixtures/ci/verify-merged-summary-smoke.json`**. Gate: **`pnpm run ci:verify-merged-summary`** / **`pnpm run ci:verify-merged-summary -- <path>`** → `scripts/ci-gates.mjs verify-merged-summary`. Optional floor: **`CHRYSALIS_VERIFY_MERGED_MIN_CORRECTNESS`**. |
| `chrysalis corpus-merge … --json-out <file>` (V2-M3) | **`kind`: `"chrysalis.corpus-merge.summary"`**, **`schemaVersion`**: `1`, **`toolVersion`**, **`generatedAt`**, **`options`**, **`sources[]`**, **`counts`**. | Fixture: **`fixtures/ci/corpus-merge-summary-smoke.json`**. Gate: **`pnpm run ci:corpus-merge-summary`** / **`pnpm run ci:corpus-merge-summary -- <path>`** → `scripts/ci-gates.mjs corpus-merge-summary`. |
| `node scripts/migration-debt.mjs --project <php-root> --json-out <path>` | **`kind`: `"chrysalis.migration-debt.summary"`**, **`schemaVersion`**: `1`, **`toolVersion`**, **`generatedAt`**, plus slices from `status --json`. | Forwards other argv to `chrysalis status`. Gates: **`--max-holes`**, **`--min-correctness`**. See `packages/cli/README.md`. |

Other **`scripts/ci-gates.mjs`** entrypoints have matching **`pnpm run ci:*`** shims (**`ci:tiny-n1-insight`**, **`ci:rewrite-pre-xss`**, **`ci:confidence-5nines`**, **`ci:confidence-trend`**, **`ci:confidence-trend-ready`**, **`ci:migration-sidecar-floors`**, **`ci:emit-layout-floors`**, **`ci:corpus-merge-summary`**); pass a path after **`--`** when the gate accepts one.

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
- **[`docs/`](./docs/)** — installation, day-to-day operations, administration, [release process](./docs/RELEASE.md), and [GitHub Project bootstrap](./docs/GITHUB_PROJECT.md).
- [`CHANGELOG.md`](./CHANGELOG.md) — release notes.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — short contributor entrypoint.
- **Cursor:** project rule **`.cursor/rules/chrysalis.mdc`** loads with the agent;
  for Cursor-specific agent workflows see the
  [agent cookbook](https://cursor.com/docs/cookbook/agent-workflows) (optional;
  does not replace `DESIGN.md` / `AGENTS.md`).

## Quick start

```bash
pnpm install
pnpm -r build
pnpm test
# With PHP on PATH — Oracle capture-time redactor smoke (also runs in CI):
pnpm run test:oracle-php-redactor
# Optional: emit-hono / emit-fastify Vitest also has temp-dir `npm install` probes;
# they run when CI=true (e.g. GitHub Actions) or when CHRYSALIS_E2E_EMIT=1.
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
# opt in to parser-bridge's nikic provider (default remains glayzzle):
node packages/cli/dist/bin.js ingest fixtures/tiny-blog --parser-provider nikic
# or set a shell default for ingest-driven commands:
CHRYSALIS_PARSER_PROVIDER=nikic node packages/cli/dist/bin.js status --project fixtures/tiny-blog
# scale-out: merge K shard ingests (ingest/emit/status; DESIGN D246, structural dedupe D247):
node packages/cli/dist/bin.js status --project fixtures/tiny-blog --merge-all-shards --shard-count 2
```

### `scripts/ci-gates.mjs` locally

Root **`package.json`** exposes **`pnpm run ci:*`** shims that forward to **`node scripts/ci-gates.mjs …`** (optional path after **`--`** where the gate accepts one). **`pnpm run ci:insight`** runs **`chrysalis insight`** for **`fixtures/tiny-n1`** then the **`tiny-n1-insight`** gate (requires a built CLI under **`packages/cli/dist/`**). Use **`pnpm run ci:tiny-n1-insight`** when **`reports/insight/tiny-n1.json`** already exists and you only want the gate. **`pnpm run ci:migration-sidecar-floors`** exits **0** with a skip log unless **`CHRYSALIS_IDIOMATICITY_MIN`** and/or **`CHRYSALIS_RESIDUAL_LEGACY_MAX`** are set. **`pnpm run ci:emit-layout-floors`** skips unless **`CHRYSALIS_EMIT_LAYOUT_MAX_*`** env ceilings are set (**`emit-stats`** layout, **DESIGN D251**).

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

## Local development

After **`pnpm install`**, run **`pnpm test`** as usual. Before the first test run, **`pretest`** installs
**`packages/parser-bridge/vendor`** via Composer when **`vendor/`** is missing and **`composer`** is runnable, so **nikic** parity tests *can* run. Those tests also require **`php`** on **`PATH`** (they subprocess PHP); without PHP they stay skipped even when **`vendor/`** exists. Without Composer, you get a one-line **`[pretest]`** warning and the suite still passes. Manual install: **`pnpm run vendor:parser-bridge`** (PHP + Composer). To skip the **`pretest`** vendor step entirely (e.g. offline): set **`CHRYSALIS_SKIP_PARSER_VENDOR=1`** before **`pnpm test`**, or run **`pnpm exec vitest run`** (does not invoke **`pretest`**).

**Migration debt (one screen):** **`pnpm run migration-debt -- --project <php-root> [...]`** forwards to **`chrysalis status --json`** and prints corpus / correctness / holes / auth counters. Add **`--json-out <path>`** (or **`--json-out=<path>`**) to write a compact JSON snapshot for CI or local trends (**DESIGN D215**). CI **`typecheck-and-test`** uploads that JSON as the **`migration-debt-json`** artifact after **`pnpm test`** (**DESIGN D216**). Same optional flags as **`status`** (e.g. **`--traces`**, **`--report`**).

**Verify on huge corpora:** **`chrysalis verify … --only-route \"METHOD /path\"`** or **`--only-trace-id <id>`** replays a slice only (see **`DESIGN` D213**).

## Why another converter?

Because every existing one reads your source code and hopes. Chrysalis reads
your source code, your database, your forms, and your live traffic, compares
the result against what your app actually does, and refuses to lie to you
about correctness. Partial output is fine — silent wrong output is not.

See `DESIGN.md § 2` for the full argument.

## License

MIT (planned).
