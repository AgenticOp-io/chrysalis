# Paused backlog and active build queue

> **Status:** authoritative (2026-06-19)  
> **Purpose:** Index for **maintenance**, **closed programs**, and **remaining honest gaps**. Strategic plan phases **0–10 closed** (**G5680–G6257**).

**Do not treat closed program tables in `ROADMAP.md` or [`archive/STRATEGIC-PLAN-SHIPPED-LOG.md`](./archive/STRATEGIC-PLAN-SHIPPED-LOG.md) as active backlog.**

---

## 1. Default queue today (maintenance)

| When the user says "build" without scope | Do this |
| --- | --- |
| Bug fix / regression / CI red | Fix it; keep gates green |
| Parser mapper gap / new PHP syntax | Maintenance §2 |
| New hole from real customer route | Maintenance §2 + verify |

**Governance:** `pnpm run hub:maintenance-mode-governance-smoke`  
**Phase 10 archive verify:** `pnpm run hub:strategic-plan-phase10-program-archive-close-smoke`  
**Maintenance complete:** `pnpm run hub:maintenance-program-complete-smoke` (`runMaintenanceProgramCompleteGate`, **G6261**)  
**Honest gaps complete:** `pnpm run hub:honest-gaps-program-complete-smoke` (`runHonestGapsProgramCompleteGate`, **G6270**)

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

## 3. Shipped by Phase 10 (reference — not backlog)

| Item | Status | Doc |
| --- | --- | --- |
| Production SQL/session (Runtime Phase C) | **Active gates** (program closed) | `RUNTIME-CWL-PARITY-PLAN.md` Phase C |
| WordPress vertical probe depth | **Shipped** | `WORDPRESS-VERTICAL-PHASE-10.md` |
| Matrix gold (customer/flagship routes) | **Shipped** | `PRODUCTION-PARITY-PHASE-10.md` Phase C |
| Multi-language evidence path | **Shipped** | Phase 10 Phase D |

---

## 4. Honest gaps (scaffolded — operator/customer action)

All five deferrals are **indexed**, **documented**, and **gate-verified** (**G6262–G6270**). They are not in-repo build backlog unless STRATEGIC-PLAN §13 is amended.

| Gap | Scaffold doc / gate | Operator action |
| --- | --- | --- |
| Real WordPress core install (not stub) | `docs/WORDPRESS-CUSTOMER-ORACLE.md` — **G6262** | Customer oracle capture on live WP tree |
| Customer north-star metrics on a live slice | `docs/CUSTOMER-NORTH-STAR-METRICS.md` — **G6263** | Measure STRATEGIC-PLAN §0 metrics on pilot |
| Commercial launch (SKUs/pricing) | `docs/COMMERCIAL.md` — **G6264** | Contracts + billing outside repo |
| Broader IR helper lifting (non-B5) | `docs/IR-HELPER-LIFTING.md` — **G6265** | Plan amendment before new lift program |
| WPTP D2+ sibling repos | `docs/MASTER-PROGRAM.md` — **G6266** | Ongoing D7 expansion in sibling repos |

**Composite gate:** `runHonestGapsProgramCompleteGate` (**G6270**)

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
| Phase 10 production parity | **G6257** | `PRODUCTION-PARITY-PHASE-10.md` |
| Ship log | **G6257** | `archive/STRATEGIC-PLAN-SHIPPED-LOG.md` |

---

*Related: [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md), [`ROADMAP.md`](../ROADMAP.md).*
