# Paused backlog and active build queue

> **Status:** authoritative (2026-06-24)  
> **Purpose:** Index for **maintenance**, **closed programs**, and **remaining honest gaps**. **CWL customer pilot program closed** (**G7490**, **D6262** / **D6263**). **CWL universal web language program closed** (**G7390**, **D6260**). **G7150** / **G7200** shipped. **WISP POC decoupled** (**D6259**).

**Do not treat closed program tables in `ROADMAP.md` or [`archive/STRATEGIC-PLAN-SHIPPED-LOG.md`](./archive/STRATEGIC-PLAN-SHIPPED-LOG.md) as active backlog.**

---

## 1. Default queue today

| When the user says "build" without scope | Do this |
| --- | --- |
| **CWL customer pilot regression (default)** | `pnpm run hub:cwl-customer-pilot-close-smoke` (**G7490**) |
| **G7390 regression (subordinate)** | Included in **G7490** composite |
| **G7150 / G7200 regression** | Included in **G7390** composite |
| **IR helper tier regression (optional)** | `hub:cwl-language-maintenance-smoke` (**G6731**) |
| Bug fix / regression / CI red | Fix it; keep gates green |
| Parser mapper gap / new PHP syntax | Maintenance §2 |

**Close before build:** Phase **N+1** requires Phase **N** close gate green.

**Governance:** `pnpm run hub:maintenance-mode-governance-smoke` (**G6160** / **cwl-pilot-closed** mode)

**Program doc:** [`CWL-CUSTOMER-PILOT-PROGRAM.md`](./CWL-CUSTOMER-PILOT-PROGRAM.md)

**Program close (shipped):** `pnpm run hub:cwl-customer-pilot-close-smoke` (**G7490**)

---

## 1a. Optional — WISP POC regression (not default build)

WISP Module_Manager is a **showcase POC** only (**D6205**, **D6259**). Smokes and deploy scripts remain; they are **not** in default CI or the default build queue.

| When | Run |
| --- | --- |
| Operator refresh / chimera deploy | `pnpm run wisp:deploy:gce`, `wisp:operator-verify -- --require` |
| Full POC regression (local or CI) | `.github/workflows/wisp-poc-regression.yml` (weekly + manual) |
| Phase 14 closed verify | `hub:wisp-cwl-phase14-program-close-smoke` (**G6690**), `hub:wisp-cwl-phase14-close-smoke` (**G6590**) |
| Phase 13 verify | `hub:wisp-cwl-phase13-close-smoke` (**G6410**), `hub:cwl-surface-taxonomy-smoke` (**G6340**) |
| Maintenance composite | `hub:wisp-cwl-maintenance-regression-smoke` (**G6710**), `hub:wisp-cwl-program-maintenance-complete-smoke` (**G6720**) |

Detail: [`WISP-CWL-FULLSTACK-PROGRAM.md`](./WISP-CWL-FULLSTACK-PROGRAM.md)

---

## 2. Maintenance (reactive)

| Trigger | Action | Pointer |
| --- | --- | --- |
| Parser mapper gap | Add contested-syntax page to `fixtures/parser-parity-probe` | Multi-lane lane A |
| IR Helper Program v1 close | `pnpm run hub:ir-helper-program-close-smoke` (**G7200**) | [`IR-HELPER-PROGRAM.md`](./IR-HELPER-PROGRAM.md) |
| IR helper tier regression (optional) | `pnpm run hub:cwl-language-maintenance-smoke` (**G6731**) | [`IR-HELPER-LIFTING.md`](./IR-HELPER-LIFTING.md) |
| CWL complete language regression | `pnpm run hub:cwl-complete-language-close-smoke` (**G7150**) | [`CWL-LANGUAGE-PROGRAM.md`](./CWL-LANGUAGE-PROGRAM.md) |
| CWL customer pilot regression | `pnpm run hub:cwl-customer-pilot-close-smoke` (**G7490**) | [`CWL-CUSTOMER-PILOT-PROGRAM.md`](./CWL-CUSTOMER-PILOT-PROGRAM.md) |
| Widen `->query` lowering | Add tracked receiver via `mysqli-probe` | Hole economics |
| Package README drift | Update README | `ROADMAP.md` |
| Redaction / verify regression | Lockstep Node + PHP redactor | `AGENTS.md` |
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
| CWL complete language Phases 15–18 | **G7150** | `CWL-LANGUAGE-PROGRAM.md` |
| IR Helper Program v1 | **G7200** | `IR-HELPER-PROGRAM.md` |
| CWL universal language Phases 19–23 | **G7390** | `CWL-UNIVERSAL-LANGUAGE-PROGRAM.md` |
| CWL customer pilot Phase 24 | **G7490** | `CWL-CUSTOMER-PILOT-PROGRAM.md` |
| WISP Phase 12–14 showcase POC | **G6690** | Optional regression (**D6259**) |

---

*Related: [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md), [`ROADMAP.md`](../ROADMAP.md), [`CWL-CUSTOMER-PILOT-PROGRAM.md`](./CWL-CUSTOMER-PILOT-PROGRAM.md), [`CWL-UNIVERSAL-LANGUAGE-PROGRAM.md`](./CWL-UNIVERSAL-LANGUAGE-PROGRAM.md).*