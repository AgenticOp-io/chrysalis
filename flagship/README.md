# Flagship migration (Milestones 4–5)

This directory holds the **first real PHP applications** Chrysalis tracks
end-to-end in public: ingest roots, optional Oracle corpora, and notes on
Laravel (or successor) layout. **Milestone 5** adds a **canonical Composer Laravel**
worktree — see **Current tree** below.

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
  example, **`chrysalis-templates/`** ingest slice for ping/health/json/redirect/DB surfaces (count, **`countViaLib`**, **`SUM(id)`**, **`MIN(id)`**, **`MAX(id)`**, **`ROUND(AVG(id))`**, **`MAX(id)-MIN(id)`**, **`SUM(id*id)`**, **`COUNT WHERE id%2=0`**, **`COUNT WHERE id%2=1`**, **`COUNT WHERE id>2`**, **`COUNT WHERE id<3`**, **`COUNT WHERE id>=2`**, **`COUNT WHERE id<=3`**, **`COUNT WHERE id<>2`**, **`COUNT WHERE id BETWEEN 2 AND 3`**, **`COUNT WHERE id=1`**, **`COUNT WHERE id=3`**, **`COUNT WHERE id=2`**, **`COUNT WHERE id<>1`**, **`COUNT WHERE id<>3`**, **`COUNT WHERE id<2`**, **`COUNT WHERE id>1`**, **`COUNT WHERE id>=1`**, **`COUNT WHERE id<=1`**, **`COUNT WHERE id BETWEEN 1 AND 2`**, **`COUNT WHERE id>3`**, **`COUNT WHERE id<1`**, **`COUNT WHERE id>=3`**, first/last item, items list), framework-wrapper, session `visit/me/login/logout`, query, and POST routes; no
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
  install; for the **full** tree see **`chrysalis-laravel-work/`** (`laravel-min/README.md`, D84).

## Status

**Milestone 4 v1 pilot is complete** (see Milestone 4 in `ROADMAP.md` and `DESIGN.md` D82). The phased
checklist (dashboard, `laravel-min` oracle + dual verify + migration/footprint, `laravel-full` templates +
scaffold + CI) is fully checked. **Milestone 5 (in progress)** names **`chrysalis-laravel-work/`** as the
canonical full Laravel root (D84) and covers **Composer Laravel / Breeze** depth, production auth beyond the fixture,
larger corpora, and pipeline-owned **idiomaticity** / **residual-legacy** JSON — start from `laravel-full/README.md` and **`scaffold:laravel-full`**, and keep
`laravel-min/README.md` for the Laravel-shaped pilot.

**Pilot snapshot — `laravel-min` (2026-04-24; bcrypt login + CSRF + logout, `/jump`, session `me`, wider GET loop incl. metadata, `/.well-known/security.txt`, `/sitemap.xml`, `/css/pilot.css`, `/manifest.webmanifest`)** — for regression triage and CI artifacts:

| Item | Value |
|------|--------|
| Manifest routes | 19 (includes `/api/health`, `/robots.txt`, `/humans.txt`, `/.well-known/security.txt`, `/sitemap.xml`, `/css/pilot.css`, `/manifest.webmanifest`, `/jump`, `/login`, `/logout`, `/session/me`) |
| Oracle driver HTTP requests | 31 per `scripts/verify-flagship-laravel-min.mjs` run |
| Verify layout | Dual emit (Hono + Fastify), `VERIFY_THRESHOLD` default **0.95** |
| Migration JSON in CI | `reports/migration/flagship-laravel-min.json` (human + machine-readable) |

**`laravel-full` templates (M4 v1):** 43 manifest routes on committed **`chrysalis-templates/`**;
ingest/emit parity tests expect **zero holes**; optional **`verify:laravel-full`** when the scaffolded
Composer tree exists (see `laravel-full/README.md`).

**Coverage / correctness** come from WebIR + verify reports (`chrysalis status`
with `--project`, `--traces`, `--report`). **Idiomaticity** and **residual
legacy** stay optional until you add JSON under `--migration-reports` (see
`laravel-min/migration-reports/README.md`); when either metric moves in a
material way, extend this table or add a dated one-line note below.

**Milestone 4+ (not v1-gated):** deeper **Composer Laravel** / **Breeze** integration, **full** web auth
(rotating CSRF, gateways, MFA/OAuth), a **larger** oracle corpus than the scripted drivers, and
pipeline-owned **idiomaticity** / **residual-legacy** scores. The v1 pilots already exercise **bcrypt** +
**CSRF field** + **logout** on deterministic fixture users where applicable.

When the emitted stack diverges from the oracle, use **`chrysalis repair`**
(see `packages/repair` and `ROADMAP` Milestone 3) against the same traces and
`--project` PHP root; patches stay verify-gated.
