# laravel-min (Milestone 4 flagship skeleton)

This is **not** a full Composer/Laravel install. It is a **Laravel-shaped**
directory layout with four procedural routes (`GET /`, `GET /health`,
`GET /items`, `GET /count`) plus a **Composer `autoload.files`** entry so CI can run
`composer install` and `public/index.php` loads `vendor/autoload.php` when
present.

## Layout

- `public/index.php` — front controller for local `php -S` (optional Composer autoload)
- `app/Http/Handlers/` — handler scripts (mirrors where Laravel keeps HTTP-layer code)
- `lib/db.php` — PDO + `query_all` / `query_one` / `exec_sql` (Chrysalis-ingest-friendly, oracle-aware)
- `schema.sql` — SQLite `items` seed used by verify and emitted `blog.sqlite`
- `data/` — runtime SQLite (`app.sqlite`); created by `pnpm run verify:flagship` / CI (gitignored)
- `chrysalis.routes.json` — ingest manifest (required)
- `chrysalis.observe.json` — Oracle redaction (minimal)
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
```

Traces land in `traces/flagship-laravel-min/`; verify reports in
`reports/verify-flagship-laravel-min/{hono,fastify}/`.

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

```bash
composer create-project laravel/laravel chrysalis-flagship-laravel
# Then: add chrysalis.routes.json pointing at route entry scripts you want
# in scope, or procedural wrappers that `require` framework bootstrapping.
```

Document new routes in `chrysalis.routes.json` and extend this README as the
pilot grows.
