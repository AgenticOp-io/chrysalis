# laravel-min (Milestone 4 flagship skeleton)

This is **not** a full Composer/Laravel install. It is a **Laravel-shaped**
directory layout with two procedural routes (`GET /`, `GET /health`) so
Chrysalis can **ingest and emit** a minimal multi-route slice while the real
Breeze (or similar) app is documented below.

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
