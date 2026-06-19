# Chrysalis - Roadmap

> Read `DESIGN.md` first. This file is the **active** execution plan.
> Completed history is archived in [`ROADMAP-ARCHIVE.md`](./ROADMAP-ARCHIVE.md).

## Status (2026-06)

- **Releases:** `v1.0.0` -> `v2.0.x` tagged on `main`.
- **Active lanes:** **Phase 10 — Production parity** (**G6200–G6253**). Phases **0–9 closed** (**G5680–G6153**).
- **Recently shipped:** Plan amendment **2026-06-19** — Runtime Phase C, WordPress entry, matrix expansion unblocked. **G6150–G6153** Phase 9 operational hardening.

---

## Default queue — Phase 10

**Active program:** [`docs/PRODUCTION-PARITY-PHASE-10.md`](./docs/PRODUCTION-PARITY-PHASE-10.md)

| Track | Gate / smoke |
| --- | --- |
| Runtime Phase C (session/SQL) | `pnpm run hub:production-sql-verify-parity-smoke`, `pnpm run test:oracle-php-session-redis` |
| WordPress vertical entry | `pnpm run hub:strategic-plan-phase10-wordpress-entry-smoke` |
| Matrix expansion | `pnpm run hub:strategic-plan-phase10-matrix-expansion-smoke` |
| Program close | `pnpm run hub:strategic-plan-phase10-production-parity-close-smoke` |

Index: [`docs/PAUSED-AND-MAINTENANCE.md`](./docs/PAUSED-AND-MAINTENANCE.md)

---

## Maintenance hygiene

Reactive work (parser probes, hole economics, docs, redaction) — see [`PAUSED-AND-MAINTENANCE.md`](./docs/PAUSED-AND-MAINTENANCE.md) §2.

**Full CI-scale tests:** `pnpm run test:gce` — [`docs/GCE-LOCAL-VERIFY.md`](./docs/GCE-LOCAL-VERIFY.md).

---

## Closed programs (archive only)

| Program | Closed at | Archive |
| --- | --- | --- |
| Strategic plan phases 0–9 | **G6153** | [`docs/STRATEGIC-PLAN.md`](./docs/STRATEGIC-PLAN.md) §7 |
| Ship log | **G6153** | [`docs/archive/STRATEGIC-PLAN-SHIPPED-LOG.md`](./docs/archive/STRATEGIC-PLAN-SHIPPED-LOG.md) |

Do **not** treat archive tables as active backlog.

Everything shipped before Phase 10 is in [`ROADMAP-ARCHIVE.md`](./ROADMAP-ARCHIVE.md).
