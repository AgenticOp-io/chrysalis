# Paused backlog and active build queue

> **Status:** authoritative (2026-06-22)  
> **Purpose:** Index for **maintenance**, **closed programs**, and **remaining honest gaps**. Strategic plan phases **0–10 closed** (**G5680–G6257**). **CWL complete language program closed** (**G7150**, Phases **15–18**, **D6206–D6208**).

**Do not treat closed program tables in `ROADMAP.md` or [`archive/STRATEGIC-PLAN-SHIPPED-LOG.md`](./archive/STRATEGIC-PLAN-SHIPPED-LOG.md) as active backlog.**

---

## 1. Default queue today

| When the user says "build" without scope | Do this |
| --- | --- |
| **IR helper maintenance** (default after G7150) | §2 below — **CWL language maintenance**; `hub:cwl-language-maintenance-smoke` (**G6731**), `hub:cwl-language-v1-close-smoke` (**G6750**) |
| **CWL complete language regression** | `hub:cwl-complete-language-close-smoke` (**G7150**), phase smokes **G7110–G7140** |
| **Phase 14 operator regression** | `hub:wisp-cwl-program-maintenance-complete-smoke` (**G6720**), `hub:wisp-cwl-maintenance-regression-smoke` (**G6710**), `hub:wisp-cwl-phase14-program-close-smoke` (**G6690**), `hub:wisp-cwl-phase14-close-smoke` (**G6590**), `wisp:operator-verify -- --require` |
| Phase 12–13 regression | `hub:wisp-cwl-phase13-close-smoke` (**G6410**), `hub:wisp-cwl-phase12-phase0-close-smoke` (**G6310**) |
| Bug fix / regression / CI red | Fix it; keep gates green |
| Parser mapper gap / new PHP syntax | Maintenance §2 |
| New hole from real customer route | Maintenance §2 + verify |

**Close before build:** Phase 13 surface work requires **G6310** closed. Regression: `pnpm run hub:wisp-cwl-phase12-phase0-close-smoke`.

**Phase 14 closed verify:** `pnpm run hub:wisp-cwl-phase14-program-close-smoke` (**G6690**), `pnpm run hub:wisp-cwl-phase14-close-smoke` (**G6590**), `pnpm run wisp:operator-verify -- --require` (**G6680**); full gate list in [`WISP-CWL-FULLSTACK-PROGRAM.md`](./WISP-CWL-FULLSTACK-PROGRAM.md) § Phase 14  
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
| IR helper B7–B39 (`empty()` / `isset()` / `count()` / `is_array()` / `is_string()` / `abs()` / `is_numeric()` / logical ! / `is_int()` / `is_bool()` / `is_null()` / unary - / `round()` / `floor()` / `ceil()` / `max()` / `min()` / `substr()` / `strpos()` / `strtolower()` / `strtoupper()` / `htmlspecialchars()` / `nl2br()` / `urlencode()` / `rawurlencode()` / `urldecode()` / `rawurldecode()` / `ltrim()` / `rtrim()` / `is_float()` / `is_object()` / `is_scalar()` inline) | `pnpm run hub:cwl-language-maintenance-smoke` (**G6731**, **G6760**, **G6770**, **G6780**, **G6790**, **G6800**, **G6810**, **G6820**, **G6830**, **G6840**, **G6850**, **G6860**, **G6870**, **G6880**, **G6890**, **G6900**, **G6910**, **G6920**, **G6930**, **G6940**, **G6950**, **G6960**, **G6970**, **G6980**, **G6990**, **G7000**, **G7010**, **G7020**, **G7030**, **G7040**, **G7050**, **G7060**) | `docs/IR-HELPER-LIFTING.md`, `docs/CWL-LANGUAGE-PROGRAM.md` — default build queue post **G7150** |
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
