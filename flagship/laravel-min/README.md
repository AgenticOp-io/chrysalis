# laravel-min (Milestone 4 flagship skeleton)

This is **not** a full Composer/Laravel install. It is a **Laravel-shaped**
directory layout with one procedural route so Chrysalis can **ingest and emit
today** while the real Breeze (or similar) app is documented below.

## Layout

- `public/index.php` — front controller for local `php -S`
- `app/Http/Handlers/` — handler scripts (mirrors where Laravel keeps HTTP-layer code)
- `chrysalis.routes.json` — ingest manifest (required)
- `chrysalis.observe.json` — Oracle redaction (minimal)

## Commands

```bash
chrysalis ingest flagship/laravel-min
chrysalis emit flagship/laravel-min --out generated/laravel-min
chrysalis status --json --project flagship/laravel-min
# Oracle capture + dual emit + replay (from repo root; needs PHP):
pnpm run verify:flagship
```

Traces land in `traces/flagship-laravel-min/`; verify reports in
`reports/verify-flagship-laravel-min/{hono,fastify}/`.

## Full Laravel (next step)

```bash
composer create-project laravel/laravel chrysalis-flagship-laravel
# Then: add chrysalis.routes.json pointing at route entry scripts you want
# in scope, or procedural wrappers that `require` framework bootstrapping.
```

Document new routes in `chrysalis.routes.json` and extend this README as the
pilot grows.
