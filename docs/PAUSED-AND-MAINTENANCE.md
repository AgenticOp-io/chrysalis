# Paused backlog and active build queue

> **Status:** authoritative (2026-06-16)  
> **Purpose:** Index for **maintenance**, **closed programs**, and **remaining honest gaps**. **Phase 31 WISP CWL UI parity closed** (**G8100**, **D6274**). **WISP production completion closed** (**G7990**, **D6272**).

**Do not treat closed program tables in `ROADMAP.md` or [`archive/STRATEGIC-PLAN-SHIPPED-LOG.md`](./archive/STRATEGIC-PLAN-SHIPPED-LOG.md) as active backlog.**

---

## 1. Default queue today

| When the user says "build" without scope | Do this |
| --- | --- |
| **G8570 wedge (closed when index green)** | `pnpm run hub:site-port-open-legacy-wedge-smoke` |
| **G8550 Migration OS (closed composite)** | `pnpm run hub:migration-os-close-smoke` (includes **G8560** IS) |
| **G8560 Intelligence Shorthand (closed, CPU)** | `pnpm run hub:intelligence-shorthand-close-smoke` |
| **G8290 Open web-LLM framework (active)** | `pnpm run hub:open-web-llm-close-smoke` |
| **G8100 WISP CWL UI parity (subordinate)** | `pnpm run hub:wisp-cwl-ui-parity-close-smoke` |
| **G7990 regression (subordinate)** | `pnpm run hub:wisp-production-completion-close-smoke` |
| **G7890 subordinate** | Included in **G7990** composite |
| **G7790 subordinate** | Included in **G7890** composite |
| **IR helper tier regression (optional)** | `hub:cwl-language-maintenance-smoke` (**G6731**); `hub:ir-helper-program-close-smoke` (**G7200**) |
| Bug fix / regression / CI red | Fix it; keep gates green |
| Parser mapper gap / new PHP syntax | Maintenance §2 |

**Governance:** `pnpm run hub:maintenance-mode-governance-smoke` (**G6160** / **G7991** / **wisp-production-completion-closed** mode)

**Program doc:** [`OPEN-WEB-LLM-PROGRAM.md`](./OPEN-WEB-LLM-PROGRAM.md)

**Program close regression:** `pnpm run hub:open-web-llm-close-smoke` (**G8290**)

**Subordinate:** [`WISP-CWL-UI-PARITY-PROGRAM.md`](./WISP-CWL-UI-PARITY-PROGRAM.md) (**G8100**), [`WISP-PRODUCTION-COMPLETION-PROGRAM.md`](./WISP-PRODUCTION-COMPLETION-PROGRAM.md) (**G7990**)

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
| Live operator deploy refresh | Operator-run — `wisp:deploy:gce` + `wisp:operator-verify --require` | `WISP-PRODUCTION-COMPLETION-PROGRAM.md` |
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
| WISP production completion | **G7990** | `hub:wisp-production-completion-close-smoke` |
| WISP production POC | **G7890** | `hub:wisp-production-poc-close-smoke` |
| WISP full site CWL | **G7790** | `hub:wisp-full-site-close-smoke` |
| Universal translator N×N | **G7690** | `hub:cwl-universal-translator-close-smoke` |
| Full web language | **G7590** | `hub:cwl-full-web-language-close-smoke` |
| Customer pilot | **G7490** | `hub:cwl-customer-pilot-close-smoke` |
| Universal language | **G7390** | `hub:cwl-universal-language-close-smoke` |
| Complete language v1 | **G7150** | `hub:cwl-complete-language-close-smoke` |
| IR Helper Program v1 | **G7200** | `hub:ir-helper-program-close-smoke` |
| WISP POC surfaces (Phase 13–14) | **G6690** | `hub:wisp-cwl-phase14-program-close-smoke` |
