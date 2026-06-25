# Paused backlog and active build queue

> **Status:** authoritative (2026-06-24)  
> **Purpose:** Index for **maintenance**, **closed programs**, and **remaining honest gaps**. **WISP full site CWL program active** (**G7700**, **D6268**). **Universal translator closed** (**G7690**). **Full web language closed** (**G7590**). **WISP POC optional regression** (**D6259**).

**Do not treat closed program tables in `ROADMAP.md` or [`archive/STRATEGIC-PLAN-SHIPPED-LOG.md`](./archive/STRATEGIC-PLAN-SHIPPED-LOG.md) as active backlog.**

---

## 1. Default queue today

| When the user says "build" without scope | Do this |
| --- | --- |
| **WISP full site CWL (default)** | Phase **27a→27f** then **G7790** — `pnpm run hub:wisp-full-site-close-smoke` |
| **G7690 regression (subordinate)** | Included in **G7790** composite |
| **G7590 regression** | Included in **G7790** composite |
| **IR helper tier regression (optional)** | `hub:cwl-language-maintenance-smoke` (**G6731**); `hub:ir-helper-program-close-smoke` (**G7200**) |
| Bug fix / regression / CI red | Fix it; keep gates green |
| Parser mapper gap / new PHP syntax | Maintenance §2 |

**Governance:** `pnpm run hub:maintenance-mode-governance-smoke` (**G6160** / **wisp-full-site-active** mode)

**Program doc:** [`WISP-FULL-SITE-CWL-PROGRAM.md`](./WISP-FULL-SITE-CWL-PROGRAM.md)

**Program entry:** `pnpm run hub:wisp-full-site-program-entry-smoke` (**G7700**)

**Program close (target):** `pnpm run hub:wisp-full-site-close-smoke` (**G7790**)

---

## 1a. Optional — WISP POC regression (legacy operator path)

Pre-Phase-27 operator deploy and chimera showcase. **Not** the default build queue.

| When | Run |
| --- | --- |
| Operator refresh / chimera deploy | `pnpm run wisp:deploy:gce`, `wisp:operator-verify -- --require` |
| Full POC regression (local or CI) | `.github/workflows/wisp-poc-regression.yml` (weekly + manual) |
| Phase 14 closed verify | `hub:wisp-cwl-phase14-program-close-smoke` (**G6690**), `hub:wisp-cwl-phase14-close-smoke` (**G6590**) |
| Phase 13 verify | `hub:wisp-cwl-phase13-close-smoke` (**G6410**), `hub:cwl-surface-taxonomy-smoke` (**G6340**) |

Detail: [`WISP-CWL-FULLSTACK-PROGRAM.md`](./WISP-CWL-FULLSTACK-PROGRAM.md)

---

## 2. Maintenance (reactive)

| Trigger | Action | Pointer |
| --- | --- | --- |
| CI red / gate failure | Fix regression; run relevant smoke | `ROADMAP.md` |
| Parser gap / unsupported PHP | Hole + fixture; IR helper tier if chartered | `AGENTS.md` §4 |
| Customer oracle / session | Redaction lockstep; Redis session smoke | `AGENTS.md` oracle-php |
| Commercial license | `@chrysalis/license` build + sign playbook | `docs/COMMERCIAL.md` |

---

## 3. Honest gaps (paused — not default build)

| Gap | Status | Doc |
| --- | --- | --- |
| Real WordPress core install | Customer-owned oracle | `WORDPRESS-CUSTOMER-ORACLE.md` |
| Customer north-star metrics | Playbook scaffolding | `CUSTOMER-NORTH-STAR-METRICS.md` |
| Commercial launch | Optional vendor gate | `COMMERCIAL.md` |
| WPTP D2+ sibling repos | Out-of-repo matrix | `MULTI-REPO-WORKSPACE.md` |
| IR helper lifting backlog | Optional **G6731** / **G7200** | `ROADMAP.md` IR helper table |

Governance hooks: `runMaintenanceProgramCompleteGate`, `runHonestGapsProgramCompleteGate`, `runHonestGapsImplementationCloseGate`.

---

## 4. Closed programs (reference only)

| Program | Close | Smoke |
| --- | --- | --- |
| Universal translator N×N | **G7690** | `hub:cwl-universal-translator-close-smoke` |
| Full web language | **G7590** | `hub:cwl-full-web-language-close-smoke` |
| Customer pilot | **G7490** | `hub:cwl-customer-pilot-close-smoke` |
| Universal language | **G7390** | `hub:cwl-universal-language-close-smoke` |
| Complete language v1 | **G7150** | `hub:cwl-complete-language-close-smoke` |
| IR Helper Program v1 | **G7200** | `hub:ir-helper-program-close-smoke` |
| WISP POC surfaces (Phase 13–14) | **G6690** | `hub:wisp-cwl-phase14-program-close-smoke` |
| Phase 10 production parity | **G6257** | `hub:strategic-plan-phase10-program-archive-close-smoke` |
