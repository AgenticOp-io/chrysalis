# Flagship migration (Milestone 4)

This directory will hold the **first real PHP application** Chrysalis tracks
end-to-end in public: ingest roots, optional Oracle corpora, and notes on
Laravel (or successor) layout.

## First target

**Laravel** — small starter (e.g. Breeze) plus a bounded set of routes and
templates we can ingest, observe, and verify without fighting WordPress-scale
dynamics.

## Metrics

Run the unified dashboard (four DESIGN success metrics roll up under
`migration`):

```bash
# After `pnpm run verify:flagship` (or in CI), include oracle + verify outputs:
chrysalis status --json --project flagship/laravel-min \
  --traces traces/flagship-laravel-min \
  --report reports/verify-flagship-laravel-min
```

- **Coverage** — IR `migration.coverage` (non-hole nodes / reachable nodes);
  requires `--project`.
- **Correctness** — verify aggregate from `--report` (same as the correctness
  section).
- **Idiomaticity** — optional `reports/migration/idiomaticity.json`:
  `{ "pct": 0.15 }` (0..1), maintained by your pipeline (e.g. rewrite pass
  stats).
- **Residual legacy** — optional `reports/migration/residual-legacy.json`:
  `{ "legacyRequestPct": 45.0 }` (0..100), e.g. from chimera or edge logs.

Override sidecar directory with `--migration-reports <dir>`.

Optional sidecar **files** for this pilot (idiomaticity / residual legacy) are
documented under `laravel-min/migration-reports/README.md`. The repo does not ship
fake scores; add JSON when a pipeline produces them.

## Current tree

- **`laravel-full/`** — Composer Laravel **adoption track** (README, empty manifest
  example, **`chrysalis-templates/`** ingest slice for ping/health/json/redirect/DB surfaces (count, **`countViaLib`** aggregate, first item, items list), framework-wrapper, session `visit/me/login/logout`, query, and POST routes; no
  `vendor/` in git). Run   **`pnpm run scaffold:laravel-full`** to create or refresh
  **`flagship/chrysalis-laravel-work/`** (gitignored): `composer create-project` on first
  run, then copy templates + **`routes/chrysalis.php`** + **`web.php`** include. After build,
  **`pnpm run verify:laravel-full`** runs Oracle + dual emit + replay when **`vendor/`** exists
  (otherwise skips), and **`pnpm run status:laravel-full`** writes optional migration JSON when
  scaffold traces/reports are present. CI mirrors this via a dedicated
  **`verify flagship (laravel-full scaffold)`** job with cache-backed scaffold reuse.
- **`laravel-min/`** — Laravel-shaped layout, `GET /`, `/hello?name=…` (query echo),
  `/health`, `/api/health` (JSON), `/robots.txt`, `/humans.txt`, `/.well-known/security.txt`, `/sitemap.xml`, `/css/pilot.css`, `/manifest.webmanifest`, `/jump` → 302 `/health`, `/items`, `/count`, `POST /echo`, `GET /session/visit` (visit counter),
  **`GET|POST /login`** (bcrypt + CSRF), **`POST /logout`**, **`GET /session/me`**; optional `composer install` for `vendor/` autoload; ingest/emit
  tests plus **`scripts/verify-flagship-laravel-min.mjs`** (Oracle → dual emit →
  replay) in CI job `verify-flagship-laravel-min`. Not a Composer Laravel
  install; see `laravel-min/README.md` for the full-framework next step.

## Status

Full **Composer Laravel / Breeze** adoption is still open: start from
`laravel-full/README.md` and the **`scaffold:laravel-full`** script; keep using
`laravel-min/README.md` for the shaped pilot. The Milestone 4 **phased checklist**
in `ROADMAP.md` remains satisfied for `laravel-min`.

**Pilot snapshot (2026-04-24; bcrypt login + CSRF + logout, `/jump`, session `me`, wider GET loop incl. metadata, `/.well-known/security.txt`, `/sitemap.xml`, `/css/pilot.css`, `/manifest.webmanifest`)** — for regression triage and CI artifacts:

| Item | Value |
|------|--------|
| Manifest routes | 19 (includes `/api/health`, `/robots.txt`, `/humans.txt`, `/.well-known/security.txt`, `/sitemap.xml`, `/css/pilot.css`, `/manifest.webmanifest`, `/jump`, `/login`, `/logout`, `/session/me`) |
| Oracle driver HTTP requests | 31 per `scripts/verify-flagship-laravel-min.mjs` run |
| Verify layout | Dual emit (Hono + Fastify), `VERIFY_THRESHOLD` default **0.95** |
| Migration JSON in CI | `reports/migration/flagship-laravel-min.json` (human + machine-readable) |

**Coverage / correctness** come from WebIR + verify reports (`chrysalis status`
with `--project`, `--traces`, `--report`). **Idiomaticity** and **residual
legacy** stay optional until you add JSON under `--migration-reports` (see
`laravel-min/migration-reports/README.md`); when either metric moves in a
material way, extend this table or add a dated one-line note below.

Still intentionally open: **Composer Laravel** and **full** web auth (rotating
CSRF, gateways, MFA/OAuth), a **larger** oracle corpus than the scripted driver,
and pipeline-owned **idiomaticity** / **residual-legacy** scores. This pilot already
uses **bcrypt** + **CSRF field** + **logout** on a deterministic fixture user.

When the emitted stack diverges from the oracle, use **`chrysalis repair`**
(see `packages/repair` and `ROADMAP` Milestone 3) against the same traces and
`--project` PHP root; patches stay verify-gated.
