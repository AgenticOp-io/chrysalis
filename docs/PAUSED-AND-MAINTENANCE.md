# Paused backlog and active build queue

> **Status:** authoritative (2026-06-19)  
> **Purpose:** Index for **maintenance**, **Phase 10 active queue**, and **remaining honest gaps**. Strategic plan phases **0–10** — Phase 10 **active** (**G6200–G6253**).

**Do not treat closed program tables in `ROADMAP.md` or [`archive/STRATEGIC-PLAN-SHIPPED-LOG.md`](./archive/STRATEGIC-PLAN-SHIPPED-LOG.md) as active backlog.**

---

## 1. Default queue today (Phase 10 active)

| When the user says "build" without scope | Do this |
| --- | --- |
| Phase 10 production parity | [`PRODUCTION-PARITY-PHASE-10.md`](./PRODUCTION-PARITY-PHASE-10.md) — session/SQL, WordPress entry, matrix expansion |
| Bug fix / regression / CI red | Fix it; keep gates green |
| Mapper gap / new PHP syntax | Maintenance §2 |
| New hole from real customer route | Maintenance §2 + verify |

**Close smoke:** `pnpm run hub:strategic-plan-phase10-production-parity-close-smoke`  
**Governance:** `pnpm run hub:maintenance-mode-governance-smoke` (routes to Phase 10 active checks)

---

## 2. Maintenance (reactive)

| Trigger | Action | Pointer |
| --- | --- | --- |
| Parser mapper gap | Add contested-syntax page to `fixtures/parser-parity-probe` | Multi-lane lane A |
| Widen `->query` lowering | Add tracked receiver via `mysqli-probe` | Hole economics |
| IR helper pattern (B5 rules) | Hub-gated fixture | `docs/IR-HELPER-LIFTING.md` |
| Package README drift | Update README | `ROADMAP.md` |
| Redaction / verify regression | Lockstep Node + PHP redactor | `AGENTS.md` |
| Refresh strict product proof | GCE: `pnpm run test:gce:phase8-strict` | Phase 8 doc |
| Full CI-scale test run | `pnpm run test:gce` | `docs/GCE-LOCAL-VERIFY.md` |

---

## 3. Unblocked by Phase 10 (2026-06-19)

| Item | Status | Doc |
| --- | --- | --- |
| Production SQL/session (Runtime Phase C) | **Active** | `RUNTIME-CWL-PARITY-PLAN.md` Phase C |
| WordPress vertical | **Active entry** | `WORDPRESS-VERTICAL-PHASE-10.md` |
| Matrix gold (customer/flagship routes) | **Active** | `PRODUCTION-PARITY-PHASE-10.md` Phase C |
| Multi-language evidence path | **Active** (second oracle) | Phase 10 Phase D |

---

## 4. Remaining honest gaps

| Gap | Notes |
| --- | --- |
| Customer north-star metrics on a live slice | Operator/pilot outside repo |
| Commercial launch (SKUs/pricing) | `docs/COMMERCIAL.md` scaffolding only |
| Broader IR helper lifting (non-B5) | Hub program when verify-gated |
| WPTP D2+ sibling repos | `docs/MASTER-PROGRAM.md` |

---

## 5. Still out of scope

- Chasing full **575×26** matrix for marketing without oracle  
- LLM repair bypassing verify  
- Rebranding structural matrix depth as full-stack oracle parity  

---

## 6. Closed programs (archive — not backlog)

| Program | Closed at | Detail |
| --- | --- | --- |
| Strategic plan phases 0–9 | **G6153** | `STRATEGIC-PLAN.md` §7 |
| Phase 10 | **active** | `PRODUCTION-PARITY-PHASE-10.md` |
| Ship log | **G6153** | `archive/STRATEGIC-PLAN-SHIPPED-LOG.md` |

---

*Related: [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md), [`ROADMAP.md`](../ROADMAP.md).*
