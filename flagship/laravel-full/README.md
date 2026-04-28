# Composer Laravel (Milestone 4–5 adoption track)

This directory is **documentation and templates only**. It does **not** ship a
`vendor/` tree. **`pnpm run scaffold:laravel-full`** materializes **`flagship/chrysalis-laravel-work/`**,
the **Milestone 5** canonical full Laravel tree (gitignored; CI-gated). Use **`laravel-min`**
alongside it as the Laravel-shaped fast fixture until those harnesses are consolidated.

**Milestone 6A:** once scaffolded, **`pnpm run verify:laravel-full`** applies **`VERIFY_THRESHOLD`** to the full corpus and to the Chrysalis **session auth slice** (`GET/POST …/chrysalis-session/login`, `GET …/me`, `GET/POST …/logout`) via **`scripts/milestone-6a-auth-verify-gate.mjs`** (D188). See **`flagship/laravel-min/README.md`** for the complementary procedural-login oracle.

## Why Chrysalis needs explicit route files

`chrysalis ingest` reads **`chrysalis.routes.json`** at the project root. Each
entry points at a **PHP file** (handler body). Laravel’s `routes/web.php`
closures are not ingest roots by themselves. The supported adoption pattern is:

1. Keep Laravel’s normal `routes/web.php` for framework wiring if you want.
2. Add **thin procedural scripts** (for example under `chrysalis/handlers/`)
   that bootstrap the HTTP kernel and answer one logical path each, **or** that
   contain only the logic you want Chrysalis to see (same pattern as
   `flagship/laravel-min/app/Http/Handlers/*.php`).
3. List those files in **`chrysalis.routes.json`** with the HTTP method and path
   you observe in the oracle.

**`chrysalis.routes.example.json`** in this folder is an empty-route starter only.
The scaffold script also writes **`chrysalis.routes.example.json`** into the
generated tree for reference; the ingestable manifest with a first route lives
under **`chrysalis-templates/`** (see below).

## Committed templates (`chrysalis-templates/`)

The directory **`chrysalis-templates/`** is a **mini project root** you can run
`chrysalis ingest` against (see `packages/ingest/tests/flagship-laravel-full-templates.test.ts`).
It contains:

- **`chrysalis.routes.json`** — fifty routes:
  **`GET /chrysalis-ping`**, **`GET /chrysalis-health.txt`**,
  **`GET /api/chrysalis-health`**, **`GET /chrysalis-jump`**,
  **`GET /chrysalis-count`**, **`GET /chrysalis-framework`**, **`GET /chrysalis-first-item`**, **`GET /chrysalis-last-item`**, **`GET /chrysalis-items`**, **`GET /chrysalis-lib-count`**, **`GET /chrysalis-sum-ids`**, **`GET /chrysalis-min-id`**, **`GET /chrysalis-max-id`**, **`GET /chrysalis-avg-id`**, **`GET /chrysalis-id-span`**, **`GET /chrysalis-sum-squares`**, **`GET /chrysalis-even-count`**, **`GET /chrysalis-odd-count`**, **`GET /chrysalis-gt-two-count`**, **`GET /chrysalis-lt-three-count`**, **`GET /chrysalis-gte-two-count`**, **`GET /chrysalis-lte-three-count`**, **`GET /chrysalis-ne-two-count`**, **`GET /chrysalis-between-count`**, **`GET /chrysalis-eq-one-count`**, **`GET /chrysalis-eq-three-count`**, **`GET /chrysalis-eq-two-count`**, **`GET /chrysalis-ne-one-count`**, **`GET /chrysalis-ne-three-count`**, **`GET /chrysalis-lt-two-count`**, **`GET /chrysalis-gt-one-count`**, **`GET /chrysalis-gte-one-count`**, **`GET /chrysalis-lte-one-count`**, **`GET /chrysalis-between-one-two-count`**, **`GET /chrysalis-gt-three-count`**, **`GET /chrysalis-lt-one-count`**, **`GET /chrysalis-gte-three-count`**, **`GET /chrysalis-lte-two-count`**, **`GET /chrysalis-eq-zero-count`**, **`GET /chrysalis-ne-zero-count`**, **`GET /chrysalis-items-snapshot`**, **`GET /chrysalis-items-group-parity`**, **`GET /chrysalis-items-cte-rollup`**, **`GET /chrysalis-recursive-stress`**,
  **`GET /chrysalis-session/visit`**, **`GET /chrysalis-session/me`**,
  **`GET /chrysalis-hello`**, **`POST /chrysalis-session/login`**,
  **`POST /chrysalis-session/logout`**,
  **`POST /chrysalis-echo`**
  → `ping_show.php`, `health_txt_show.php`, `api_health_show.php`, `jump_show.php`,
  `count_show.php`, `framework_show.php`, `first_item_show.php`, `last_item_show.php`, `items_list_show.php`, `lib_count_show.php`, `sum_ids_show.php`, `min_id_show.php`, `max_id_show.php`, `avg_id_show.php`, `id_span_show.php`, `sum_squares_show.php`, `even_count_show.php`, `odd_count_show.php`, `gt_two_count_show.php`, `lt_three_count_show.php`, `gte_two_count_show.php`, `lte_three_count_show.php`, `ne_two_count_show.php`, `between_count_show.php`, `eq_one_count_show.php`, `eq_three_count_show.php`, `eq_two_count_show.php`, `ne_one_count_show.php`, `ne_three_count_show.php`, `lt_two_count_show.php`, `gt_one_count_show.php`, `gte_one_count_show.php`, `lte_one_count_show.php`, `between_one_two_count_show.php`, `gt_three_count_show.php`, `lt_one_count_show.php`, `gte_three_count_show.php`, `lte_two_count_show.php`, `eq_zero_count_show.php`, `ne_zero_count_show.php`, `items_snapshot_show.php`, `items_group_parity_show.php`, `items_cte_rollup_show.php`, `recursive_stress_show.php`, `session_visit_show.php`, `session_me_show.php`, `hello_show.php`,
  `session_login_post.php`, `session_logout_post.php`, `echo_post.php`
- **`chrysalis/handlers/*.php`** — deterministic plain text / JSON / redirect / DB / session / query surfaces
  (no `Date.now`, no env)
- **`routes/chrysalis.stub.php`** — copied into a real Laravel app as **`routes/chrysalis.php`**;
  registers the template paths (text/plain, JSON, redirect, session, query echo, POST echo, and one
  bounded response-factory wrapper path) against
  those handler files.

## Scaffold a real Laravel tree (local)

From the **repository root**, with **Composer** on `PATH`:

```bash
pnpm run scaffold:laravel-full
```

**First run:** `composer create-project laravel/laravel` into
**`flagship/chrysalis-laravel-work/`** (gitignored), then the script copies the
templates, adds **`routes/chrysalis.php`**, and appends
**`require __DIR__.'/chrysalis.php';`** to **`routes/web.php`** when that line is
not already present.

**Later runs** (when **`composer.json`** already exists): skips `create-project` and
**re-syncs** the Chrysalis files and the **`web.php`** include (idempotent).

Then:

1. **`php artisan serve`** (or your stack) and open:
   **`/chrysalis-ping`**, **`/chrysalis-health.txt`**, **`/api/chrysalis-health`**,
   **`/chrysalis-jump`**, **`/chrysalis-count`**, **`/chrysalis-framework`**, **`/chrysalis-first-item`**, **`/chrysalis-last-item`**, **`/chrysalis-items`**, **`/chrysalis-lib-count`**, **`/chrysalis-sum-ids`**, **`/chrysalis-min-id`**, **`/chrysalis-max-id`**, **`/chrysalis-avg-id`**, **`/chrysalis-id-span`**, **`/chrysalis-sum-squares`**, **`/chrysalis-even-count`**, **`/chrysalis-odd-count`**, **`/chrysalis-gt-two-count`**, **`/chrysalis-lt-three-count`**, **`/chrysalis-gte-two-count`**, **`/chrysalis-lte-three-count`**, **`/chrysalis-ne-two-count`**, **`/chrysalis-between-count`**, **`/chrysalis-eq-one-count`**, **`/chrysalis-eq-three-count`**, **`/chrysalis-eq-two-count`**, **`/chrysalis-ne-one-count`**, **`/chrysalis-ne-three-count`**, **`/chrysalis-lt-two-count`**, **`/chrysalis-gt-one-count`**, **`/chrysalis-gte-one-count`**, **`/chrysalis-lte-one-count`**, **`/chrysalis-between-one-two-count`**, **`/chrysalis-gt-three-count`**, **`/chrysalis-lt-one-count`**, **`/chrysalis-gte-three-count`**, **`/chrysalis-lte-two-count`**, **`/chrysalis-eq-zero-count`**, **`/chrysalis-ne-zero-count`**, **`/chrysalis-items-snapshot`**, **`/chrysalis-items-group-parity`**, **`/chrysalis-items-cte-rollup`**, **`/chrysalis-recursive-stress`**, **`/chrysalis-session/visit`**, **`/chrysalis-session/me`**,
   **`/chrysalis-hello?name=you`**,
   then `curl -X POST -d "username=flagship" http://127.0.0.1:8000/chrysalis-session/login`,
   `curl -X POST http://127.0.0.1:8000/chrysalis-session/logout`,
   then `curl -X POST -d "msg=hello" http://127.0.0.1:8000/chrysalis-echo`
   to confirm runtime routes match the manifest paths.
2. **`chrysalis ingest flagship/chrysalis-laravel-work`** (from repo root; CLI must
   be built).
3. Optional UI starter: inside the generated app, follow Laravel’s docs for
   **Breeze** (`composer require laravel/breeze` and `php artisan breeze:install`).
4. After **`pnpm run build`** at the repo root, run **`pnpm run verify:laravel-full`**
   (`scripts/verify-flagship-laravel-full.mjs`). It skips if PHP is missing or if
   **`vendor/`** / **`public/index.php`** are absent; otherwise it captures
   **`/chrysalis-ping`** x2, **`/chrysalis-health.txt`** x2, **`/api/chrysalis-health`** x2,
   **`/chrysalis-jump`** (manual redirect), **`/chrysalis-count`** x2, **`/chrysalis-framework`** x2, **`/chrysalis-first-item`** x2, **`/chrysalis-last-item`** x2, **`/chrysalis-items`** x2, **`/chrysalis-lib-count`** x2, **`/chrysalis-sum-ids`** x2, **`/chrysalis-min-id`** x2, **`/chrysalis-max-id`** x2, **`/chrysalis-avg-id`** x2, **`/chrysalis-id-span`** x2, **`/chrysalis-sum-squares`** x2, **`/chrysalis-even-count`** x2, **`/chrysalis-odd-count`** x2, **`/chrysalis-gt-two-count`** x2, **`/chrysalis-lt-three-count`** x2, **`/chrysalis-gte-two-count`** x2, **`/chrysalis-lte-three-count`** x2, **`/chrysalis-ne-two-count`** x2, **`/chrysalis-between-count`** x2, **`/chrysalis-eq-one-count`** x2, **`/chrysalis-eq-three-count`** x2, **`/chrysalis-eq-two-count`** x2, **`/chrysalis-ne-one-count`** x2, **`/chrysalis-ne-three-count`** x2, **`/chrysalis-lt-two-count`** x2, **`/chrysalis-gt-one-count`** x2, **`/chrysalis-gte-one-count`** x2, **`/chrysalis-lte-one-count`** x2, **`/chrysalis-between-one-two-count`** x2, **`/chrysalis-gt-three-count`** x2, **`/chrysalis-lt-one-count`** x2, **`/chrysalis-gte-three-count`** x2, **`/chrysalis-lte-two-count`** x2, **`/chrysalis-eq-zero-count`** x2, **`/chrysalis-ne-zero-count`** x2, **`/chrysalis-items-snapshot`** x2, **`/chrysalis-items-group-parity`** x2, **`/chrysalis-items-cte-rollup`** x2, **`/chrysalis-recursive-stress`** x2,    **`/chrysalis-session/visit`** x2,
   **`/chrysalis-hello`** (no query, default name), **`/chrysalis-hello?name=`**, **`/chrysalis-hello?name=...`** x2,
   plus one encoded multi-word name, **`GET /chrysalis-session/me`** around
   login/logout POSTs, and **`POST /chrysalis-echo`** x2 against **`public/`**,
   ingests the project root, dual-emits, and replays
   (same harness shape as `verify:flagship`). Traces land under
   **`traces/flagship-laravel-full/`**; reports under **`reports/verify-flagship-laravel-full/`**.
   Stress option: run **`pnpm run verify:laravel-full:stress`** to replay each backend three
   times (`--stress-runs=3`) and fail on report fingerprint drift.
   Seed-variant option: run **`pnpm run verify:laravel-full:seed-matrix`** to replay across
   **`baseline`**, **`empty`**, and **`ten`** item seeds (`--seed-variants=...`) with seed-aware
   semantic assertions. The top-level confidence JSON then includes **`matrixCrossBackendParityOk`**
   (rollup over variants).
   Five-nines gate: run **`pnpm run verify:laravel-full:5nines`** to combine
   seed matrix + stress replay, enforce negative-path/semantic/metamorphic checks,
   and gate `reports/confidence/flagship-laravel-full.json` via `ci-gates`
   (includes `cross-backend-verify-parity`: Hono vs Fastify run-1 stable verify report match).
   Trend history is written to
   **`reports/confidence/history/flagship-laravel-full.history.json`** and checked by
   `confidence-trend` (rolling streak; warmup support via env).
   CI automatically flips warmup to strict mode once history reaches the configured
   streak using `confidence-trend-ready`.
5. Optional status roll-up: **`pnpm run status:laravel-full`**
   (`scripts/status-flagship-laravel-full.mjs`). It skips when scaffold/traces/reports are missing;
   otherwise it gates `status-migration` and writes
   **`reports/migration/flagship-laravel-full.json`**. When
   **`reports/migration/flagship-laravel-full-emit-stats.json`** exists (after a successful
   **`verify:laravel-full`**), it also writes **`reports/migration/idiomaticity.json`** and
   **`reports/migration/residual-legacy.json`** for `chrysalis status --json` (see
   **`scripts/flagship-migration-metrics.mjs`**).
  CI runs **`pnpm run release-gate:migration-sidecars`** after status (D166),
  enforcing release defaults (**idiomaticity >= 0.01**, **residual legacy <= 50**)
  via `migration-sidecar-floors-release`. Override with
  **`CHRYSALIS_RELEASE_IDIOMATICITY_MIN`** / **`CHRYSALIS_RELEASE_RESIDUAL_LEGACY_MAX`**
  or per-run **`CHRYSALIS_IDIOMATICITY_MIN`** / **`CHRYSALIS_RESIDUAL_LEGACY_MAX`**.
6. CI parity: workflow job **`verify flagship (laravel-full scaffold)`** restores caches,
   refreshes the scaffold, runs `verify:laravel-full:5nines`, then `status:laravel-full`, and uploads
   verify + migration + confidence artifacts. The lane runs at
   **`VERIFY_THRESHOLD=0.99999`** and persists confidence trend history via cache.

## Optional Breeze (Milestone 5)

CI enables Breeze on the canonical worktree via **`CHRYSALIS_SCAFFOLD_BREEZE=1`**
when running **`pnpm run scaffold:laravel-full`** (see root **`package.json`** and
**`.github/workflows/ci.yml`**). Locally, either set that env var or run
**`pnpm run scaffold:laravel-full:breeze`** (same as **`--with-breeze`** on the script).

The scaffold runs **`composer require laravel/breeze --dev`**, **`php artisan breeze:install blade --no-interaction --pest`**,
**`php artisan migrate --force`**, then **`npm ci`/`npm install`** and **`npm run build`**, and finally
re-syncs **`chrysalis-templates/`** so **`routes/web.php`** still loads **`routes/chrysalis.php`**.

Chrysalis ingest remains **manifest-scoped** (`chrysalis.routes.json` only). Breeze’s published auth
UI is **out of scope** until those entrypoints are listed in the manifest and the oracle is extended
(see `ROADMAP.md` Milestone 5).

## Relation to `laravel-min`

- **`laravel-min`** — committed Laravel-shaped pilot; CI ingest, dual emit, and
  `verify:flagship` run against it today. **Decision D122:** this remains the
  permanent fast regression fixture and is not folded into `laravel-full`.
- **`chrysalis-laravel-work`** — local Composer output; not committed; the next
  place to wire **`chrysalis.routes.json`**, Oracle traces, and (when ready) a
  sibling verify script or an extension of the existing driver.

When a Composer-backed tree is ready to be tracked in git (without `vendor/`),
document the layout in `flagship/README.md` and add a ROADMAP checklist item for
CI wiring.
