# Paused backlog and active build queue

> **Status:** authoritative (2026-06-16)  
> **Purpose:** Index for **maintenance**, **closed programs**, and **remaining honest gaps**.  
> **Active operator stack:** [`MIGRATION-OS.md`](./MIGRATION-OS.md) — start there, not here, if you are new.

**Do not treat closed program tables in `ROADMAP.md` or [`archive/STRATEGIC-PLAN-SHIPPED-LOG.md`](./archive/STRATEGIC-PLAN-SHIPPED-LOG.md) as active backlog.**  
**Historical phase docs:** [`archive/INDEX.md`](./archive/INDEX.md).

---

## 1. Default queue today

When the user says **"build"** without scope, prefer [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md) §12. Summary:

| Priority | Gate | Smoke |
| --- | --- | --- |
| **Migration OS composite** | **G8550** | `hub:migration-os-close-smoke` |
| **Unified WISP + web-LLM POC** | **G8310** | `hub:wisp-web-llm-poc-close-smoke` (+ `CHRYSALIS_G8310_LIVE=1` for live) |
| **Open Legacy wedge regression** | **G8570** | `hub:site-port-open-legacy-wedge-smoke` |
| **Web-LLM framework** | **G8290** | `hub:open-web-llm-close-smoke` |
| **Intelligence Shorthand (CPU)** | **G8560** | `hub:intelligence-shorthand-close-smoke` |

**One-command demo:** `pnpm run migration-evidence:demo`  
**Program docs:** [`MIGRATION-OS.md`](./MIGRATION-OS.md) · [`OPEN-WEB-LLM-PROGRAM.md`](./OPEN-WEB-LLM-PROGRAM.md)

### Subordinate (closed — regression only)

| Gate | Smoke | Doc |
| --- | --- | --- |
| **G8100** WISP CWL UI parity | `hub:wisp-cwl-ui-parity-close-smoke` | [`WISP-CWL-UI-PARITY-PROGRAM.md`](./WISP-CWL-UI-PARITY-PROGRAM.md) |
| **G7990** WISP production completion | `hub:wisp-production-completion-close-smoke` | [`WISP-PRODUCTION-COMPLETION-PROGRAM.md`](./WISP-PRODUCTION-COMPLETION-PROGRAM.md) |
| **G7890** / **G7790** | Composed in **G7990** | [`archive/INDEX.md`](./archive/INDEX.md) |
| **G6731** / **G7200** IR helper (optional) | `hub:cwl-language-maintenance-smoke` | [`IR-HELPER-PROGRAM.md`](./IR-HELPER-PROGRAM.md) |

**Governance:** `pnpm run hub:maintenance-mode-governance-smoke` (**G6160** / **G7991**)

| Trigger | Action |
| --- | --- |
| Bug fix / CI red | Fix regression; run relevant smoke |
| Parser gap | Hole + fixture per `AGENTS.md` §4 |

---

## 1a. Optional — WISP POC regression (legacy operator path)

Pre-Phase-27 operator deploy and chimera showcase. **Not** the default build queue.

| When | Run |
| --- | --- |
| Operator refresh / chimera deploy | `wisp:deploy:gce`, `wisp:operator-verify -- --require` |
| Full POC regression (local or CI) | `.github/workflows/wisp-poc-regression.yml` |
| Phase 14 closed verify | `hub:wisp-cwl-phase14-program-close-smoke` (**G6690**) |
| Phase 13 verify | `hub:wisp-cwl-phase13-close-smoke` (**G6410**) |

Detail: [`WISP-CWL-FULLSTACK-PROGRAM.md`](./WISP-CWL-FULLSTACK-PROGRAM.md) (archived — [`archive/INDEX.md`](./archive/INDEX.md))

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
| IR helper lifting backlog | Optional **G6731** / **G7200** | `archive/INDEX.md` → IR Helper |

Governance hooks: `runMaintenanceProgramCompleteGate`, `runHonestGapsProgramCompleteGate`, `runHonestGapsImplementationCloseGate`.

---

## 4. Closed programs (reference only)

Full catalog: [`archive/INDEX.md`](./archive/INDEX.md).

| Program | Close | Smoke |
| --- | --- | --- |
| Migration OS composite | **G8550** | `hub:migration-os-close-smoke` |
| Intelligence Shorthand | **G8560** | `hub:intelligence-shorthand-close-smoke` |
| Open Legacy expansion | **G8520** / **G8570** | `hub:site-port-open-legacy-close-smoke` |
| VMF hub API | **G8540** | `hub:site-port-federation-hub-close-smoke` |
| Site → CWL → LLM | **G8400** / **G8410** | `hub:site-port-close-smoke` |
| WISP production completion | **G7990** | `hub:wisp-production-completion-close-smoke` |
| WISP full site CWL | **G7790** | `hub:wisp-full-site-close-smoke` |
| Complete language v1 | **G7150** | `hub:cwl-complete-language-close-smoke` |
| IR Helper Program v1 | **G7200** | `hub:ir-helper-program-close-smoke` |
