# Chrysalis - Roadmap

> Read `DESIGN.md` first. This file is the **active** execution plan.
> Completed history - shipped G-series slices (through G2398), Milestones 0-6A,
> and the Road to Chrysalis 2.0 program - is archived in
> [`ROADMAP-ARCHIVE.md`](./ROADMAP-ARCHIVE.md).

Milestones are intentionally thin vertical slices: each must produce a runnable
demo and measurable numbers, not a pile of abstractions.

## Status (2026-06)

- **Releases:** `v1.0.0` -> `v2.0.x` tagged on `main`. The Chrysalis 2.0 scale-out
  milestones (`V2-M1`-`V2-M6`) are complete; see `CHANGELOG.md` and
  [`ROADMAP-ARCHIVE.md`](./ROADMAP-ARCHIVE.md).
- **v1 scope:** Milestones 0-6A complete (the closed v1 checklist - archived).
- **Active lanes:** **Strategic plan phases 0–9 closed** (**G5680–G6153**). Default queue → **maintenance** per [`docs/PAUSED-AND-MAINTENANCE.md`](./docs/PAUSED-AND-MAINTENANCE.md).
- **Recently shipped:** **G6150–G6153** — Phase 9 operational hardening (hub-completion 512). **G6110–G6113** — Phase 8 strict proof on GCE. Prior slices in [`ROADMAP-ARCHIVE.md`](./ROADMAP-ARCHIVE.md).

---

## Default queue

**There is no active feature backlog.** When build scope is unclear, use [`docs/PAUSED-AND-MAINTENANCE.md`](./docs/PAUSED-AND-MAINTENANCE.md):

| Section | What it covers |
| --- | --- |
| §1 Default queue today | What "build" means now |
| §2 Maintenance | Reactive triggers (parser, holes, CI, docs) |
| §3 Policy-paused | Do not open without plan amendment |
| §4 Honest gaps | Real work that needs a **new phase** (e.g. production SQL/session) |
| §6 Closed programs | Archive pointers — **not** backlog |

---

## Maintenance hygiene

Ongoing hygiene (not scheduled G-series slices):

- **Parser:** contested-syntax pages in **`fixtures/parser-parity-probe`** when mapper gaps appear.
- **Hole economics:** **`db-query-unknown-receiver-probe`** stays the intentional **1-hole** negative probe.
- **IR helper lifting:** hub-gated B5.x patterns only — **`docs/IR-HELPER-LIFTING.md`**.
- **Cross-cutting:** PHP surface vs glayzzle/nikic, rewrite confidence, package README accuracy, redaction lockstep, verify performance — see [`ROADMAP-ARCHIVE.md`](./ROADMAP-ARCHIVE.md) cross-cutting notes and `DESIGN.md` Decision Log.

**Full CI-scale tests:** `pnpm run test:gce` on Linux GCE — **`docs/GCE-LOCAL-VERIFY.md`**.

---

## Closed programs (archive only)

Do **not** treat these as active backlog. Detail lives in archive docs.

| Program | Closed at | Archive |
| --- | --- | --- |
| Strategic plan phases 0–9 | **G6153** | [`docs/STRATEGIC-PLAN.md`](./docs/STRATEGIC-PLAN.md) §7 |
| Next 90 days ship log | **G6153** | [`docs/archive/STRATEGIC-PLAN-SHIPPED-LOG.md`](./docs/archive/STRATEGIC-PLAN-SHIPPED-LOG.md) |
| Post-2.0 options A–E | 2026-06-17 | [`ROADMAP-ARCHIVE.md`](./ROADMAP-ARCHIVE.md) |
| Multi-lane Waves 0–6 | **G2399** | [`ROADMAP-ARCHIVE.md`](./ROADMAP-ARCHIVE.md) |
| CWL full-stack queues 111–437 | schema **510** | [`docs/archive/CWL-FULLSTACK-BUILD-LOG.md`](./docs/archive/CWL-FULLSTACK-BUILD-LOG.md) |
| Hub verify-gaps months 26–30 | schema **74** | ship log § Hub verify-gaps |
| Commercial scaffolding | baseline | [`docs/COMMERCIAL.md`](./docs/COMMERCIAL.md) (not a public launch) |

Everything already shipped is logged in [`ROADMAP-ARCHIVE.md`](./ROADMAP-ARCHIVE.md).
