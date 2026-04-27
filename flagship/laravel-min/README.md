# laravel-min (Milestone 4 flagship skeleton)

**Milestone 5 note:** this tree stays the **Laravel-shaped** fast regression fixture (nineteen routes,
`verify:flagship`). The **canonical full Composer Laravel** ingest/oracle root is
**`../chrysalis-laravel-work/`** — run **`pnpm run scaffold:laravel-full`** from the repo root (see
**`../laravel-full/README.md`** and `DESIGN.md` D84).

**Credentials (fixture only):** user `flagship`, password `secret`, CSRF body field
`csrf=flagship_csrf_static` — for oracle/verify and local smoke tests, not real
secrets.

This is **not** a full Composer/Laravel install. It is a **Laravel-shaped**
directory layout with nineteen procedural routes (`GET /`, `GET /hello`, `GET /health`,
`GET /jump`, `GET /api/health`, `GET /robots.txt`, `GET /humans.txt`, `GET /.well-known/security.txt`, `GET /sitemap.xml`, `GET /css/pilot.css`, `GET /manifest.webmanifest`, `GET /items`, `GET /count`, `POST /echo`, `GET /session/visit`, `GET /login`,
`POST /login`, `POST /logout`, `GET /session/me`) plus a **Composer `autoload.files`** entry so CI can run
`composer install` and `public/index.php` loads `vendor/autoload.php` when
present.

## Layout

- `public/index.php` — front controller for local `php -S` (optional Composer autoload)
- `app/Http/Handlers/` — handler scripts (mirrors where Laravel keeps HTTP-layer code)
- `lib/db.php` — PDO + `query_all` / `query_one` / `exec_sql` (Chrysalis-ingest-friendly, oracle-aware)
- `schema.sql` — SQLite `items` + `users` seed (`flagship` user; password bcrypt of `secret` applied by `verify:flagship` / CI)
- `data/` — runtime SQLite (`app.sqlite`); created by `pnpm run verify:flagship` / CI (gitignored)
- `chrysalis.routes.json` — ingest manifest (required)
- `chrysalis.observe.json` — Oracle redaction (minimal)
- `migration-reports/README.md` — optional `idiomaticity.json` / `residual-legacy.json` for `chrysalis status`
- `composer.json` — PHP 8.1+ and `app/autoload.php` (run `composer install` in this directory)

## Commands

```bash
cd flagship/laravel-min && composer install   # optional locally; required in CI before verify
cd ../..
chrysalis ingest flagship/laravel-min
chrysalis emit flagship/laravel-min --out generated/laravel-min
chrysalis status --json --project flagship/laravel-min
# Oracle capture + dual emit + replay (from repo root; needs PHP):
pnpm run verify:flagship
# Migration JSON + optional idiomaticity/residual sidecars (emit-stats from verify):
pnpm run status:laravel-min
```

Traces land in `traces/flagship-laravel-min/`; oracle capture hits **`GET /hello`** with
no query (default **`guest`**), **`?name=`**, two fixed names, and an encoded multi-word
**`name`**, then asserts each distinct **`hello:`** body plus route contracts for
`/health`, `/api/health`, `/jump`, `/session/me`, login/logout redirects, and
metadata/static outputs (`/robots.txt`, `/humans.txt`, `/.well-known/security.txt`,
`/sitemap.xml`, `/css/pilot.css`, `/manifest.webmanifest`) before ingest/emit.
Echo request-shape negatives are pinned too: empty/json `POST /echo` => `400 msg required`,
and `GET /echo` stays `404 Not Found`.
Post-capture checks also pin **`GET /`** HTML, **`/items`** / **`/count`** (seeded **`items`** table),
**`/session/visit`** visit counter steps, minimal **`GET /login`** form HTML, and a
**`POST /login`** **403** on bad **CSRF** before the good login.
Verify also enforces stable cross-backend report parity (Hono vs Fastify fingerprints).
Verify reports in
`reports/verify-flagship-laravel-min/{hono,fastify}/`. Verify also writes
**`reports/migration/flagship-laravel-min-emit-stats.json`**; **`pnpm run status:laravel-min`**
mirrors CI: gates **`status-migration`**, writes **`reports/migration/flagship-laravel-min.json`**,
and when emit stats exist, **`idiomaticity.json`** / **`residual-legacy.json`** (see
**`scripts/flagship-migration-metrics.mjs`**).

### Optional: verify-gated repair

If replay shows divergences and you have a running emitted app URL:

```bash
chrysalis repair traces/flagship-laravel-min --base-url http://127.0.0.1:<port> \
  --project flagship/laravel-min
# Optional: --llm (needs CHRYSALIS_REPAIR_LLM_API_KEY), --hole-patch <patch.json>,
# --write-module out/webir.json after success
```

Same full-corpus replay bar as `verify`; see `@chrysalis/repair` and `ROADMAP`
Milestone 3.

## Full Laravel (next step)

Use the adoption track under **`../laravel-full/`** (README, manifest example,
and **`pnpm run scaffold:laravel-full`** from the repo root). That materializes
**`flagship/chrysalis-laravel-work/`** (gitignored) via Composer; then add
**`chrysalis.routes.json`** pointing at handler scripts you want in scope, or
procedural wrappers that bootstrap the framework.

```bash
# From repo root (see ../laravel-full/README.md for details):
pnpm run scaffold:laravel-full
```

Document new routes in `chrysalis.routes.json` and extend this README as the
pilot grows.


