# Chrysalis - Roadmap

> Read `DESIGN.md` first. This file is the **active** execution plan.
> Completed history is archived in [`ROADMAP-ARCHIVE.md`](./ROADMAP-ARCHIVE.md).

## Status (2026-06)

- **Releases:** `v1.0.0` -> `v2.0.x` tagged on `main`.
- **Active lanes:** **maintenance only** — strategic plan phases **0–10 closed** (**G5680–G6257**).
- **Recently shipped:** **G6229–G6261** maintenance program complete (2026-06-19). Phase 10 archive **G6257**.

---

## Default queue — maintenance

There is no active feature backlog. When the user says "build" without scope:

| Trigger | Action | Pointer |
| --- | --- | --- |
| Bug fix / regression / CI red | Fix it; keep gates green | — |
| Parser mapper gap / hole economics | Maintenance §2 | [`docs/PAUSED-AND-MAINTENANCE.md`](./docs/PAUSED-AND-MAINTENANCE.md) |
| New hole from customer route | Maintenance §2 + verify | same |

**Governance:** `pnpm run hub:maintenance-mode-governance-smoke`  
**Phase 10 archive verify:** `pnpm run hub:strategic-plan-phase10-program-archive-close-smoke`

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
| Phase 10 production parity | **G6257** | [`docs/PRODUCTION-PARITY-PHASE-10.md`](./docs/PRODUCTION-PARITY-PHASE-10.md) |
| Ship log | **G6257** | [`docs/archive/STRATEGIC-PLAN-SHIPPED-LOG.md`](./docs/archive/STRATEGIC-PLAN-SHIPPED-LOG.md) |

Do **not** treat archive tables as active backlog.

Everything shipped before Phase 10 archive is in [`ROADMAP-ARCHIVE.md`](./ROADMAP-ARCHIVE.md).
