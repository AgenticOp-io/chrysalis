# Paused backlog and active build queue

> **Status:** authoritative (2026-06-19)  
> **Purpose:** Index for **maintenance**, **closed programs**, and **remaining honest gaps**. Strategic plan phases **0–10 closed** (**G5680–G6257**).

**Do not treat closed program tables in `ROADMAP.md` or [`archive/STRATEGIC-PLAN-SHIPPED-LOG.md`](./archive/STRATEGIC-PLAN-SHIPPED-LOG.md) as active backlog.**

---

## 1. Default queue today

| When the user says "build" without scope | Do this |
| --- | --- |
| **Maintenance** (default) | [`PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) §2 |
| Phase 12 WISP (deploy/maintenance) | [`WISP-CWL-FULLSTACK-PROGRAM.md`](./WISP-CWL-FULLSTACK-PROGRAM.md) — Phase 0 + Phase 13 **closed** |
| Bug fix / regression / CI red | Fix it; keep gates green |
| Parser mapper gap / new PHP syntax | Maintenance §2 |
| New hole from real customer route | Maintenance §2 + verify |

**Close before build:** Phase 13 surface work requires **G6310** closed. Regression: `pnpm run hub:wisp-cwl-phase12-phase0-close-smoke`.

**Phase 13 verify:** `pnpm run hub:wisp-cwl-phase13-close-smoke` (**G6410**), `pnpm run hub:cwl-surface-taxonomy-smoke` (**G6340**)
**Phase 12 Phase 0 regression:** `pnpm run hub:wisp-cwl-phase12-phase0-close-smoke` (**G6310**)

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

## 4. Honest gaps (implemented — operator-only remainder)

In-repo implementation **closed** at **G6290** (Phase 11). Gates remain green via `pnpm run hub:honest-gaps-implementation-close-smoke`.

| Gap | In-repo (shipped) | Operator-only remainder |
| --- | --- | --- |
| Real WordPress core install | `fixtures/wordpress-customer-sample` + **G6280** | Live customer tree oracle capture |
| Customer north-star metrics | **G6281** status JSON on `tiny-blog` | Pilot metrics on proprietary slice |
| Commercial launch | **G6282** license verify + SKU fixture | Billing/contracts outside repo |
| IR helper lifting (non-B5) | **G6283** B6 `strlen()` inline | Further B6+ design passes |
| WPTP D2+ sibling repos | **G6284** D7 harness audit | Ongoing D7 expansion in siblings |

**Composite gates:** `runHonestGapsProgramCompleteGate` (**G6270**), `runHonestGapsImplementationCloseGate` (**G6290**)

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
