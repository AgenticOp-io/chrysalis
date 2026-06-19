# WordPress customer oracle playbook

> **Status:** scaffolded (2026-06-19) — **G6262**  
> **Gate:** `runWordPressCustomerOracleScaffoldingGate`  
> **In-repo dev path:** `fixtures/wordpress-core-stub`, `fixtures/wordpress-probe`, `fixtures/wordpress-customer-sample` (**G6280**)  
> **Production path:** customer-owned WordPress install + oracle capture (outside CI)

## Goal

Ship **verify-gated** evidence on a **real customer WordPress tree** without bundling WordPress core in this repository.

## Dev fixtures (in-repo)

| Fixture | Role | Gates |
| --- | --- | --- |
| `fixtures/wordpress-probe` | Public + admin routes; manifest `wordpressEffectCallees` | G6212–G6228 |
| `fixtures/wordpress-core-stub` | Stub `wp_*` in `lib/wp-core-stubs.php` | G6224, G6229 |

These prove ingest, emit, and verify replay for the WordPress vertical. They are **not** a substitute for customer oracle evidence on a live install.

## Customer oracle workflow (operator)

1. **Scope** — Identify in-scope routes on the customer slice (public + admin as needed).
2. **Capture** — Run oracle capture on the customer PHP tree (`chrysalis observe` / probe corpus per `docs/USER-GUIDE.md`).
3. **Emit** — Generate hono/fastify handlers from ingested WebIR.
4. **Verify** — Replay against captured corpus; target **correctness 1** on in-scope routes.
5. **Record** — Store corpus metadata and verify summary in the customer evidence pack (Hub migration OS).

## Non-goals

- Shipping WordPress core tarball in CI
- Silent best-effort translation of unsupported `wp_*` (emit **holes** instead)
- Claiming full plugin ecosystem parity without per-plugin evidence

## Related

- [`WORDPRESS-VERTICAL-PHASE-10.md`](./WORDPRESS-VERTICAL-PHASE-10.md) — closed in-repo program
- [`PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) §4 — honest gap indexed
