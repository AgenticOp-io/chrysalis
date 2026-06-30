> **Archive notice:** Closed **program** — regression and history only. Active stack: [MIGRATION-OS.md](./MIGRATION-OS.md). Index: [rchive/INDEX.md](./archive/INDEX.md).

# WISP production completion program (Phase 29)

> **Status:** **Program closed** (2026-06-27, **G7990**) — was **active** (**G7900**, 2026-06-27)
> **Authority:** **DESIGN D6272**; requires **G7890** WISP production POC **closed**  
> **Predecessor:** [`WISP-PRODUCTION-POC-PROGRAM.md`](./WISP-PRODUCTION-POC-PROGRAM.md)

## Thesis

Phase **28** closed the production POC bar (operator contracts, pipeline, integrations, pilot trace). Phase **29** closes the remaining **honest gaps** for the WISP CWL move: full native API oracle corpus, CWL static export for Firebase Hosting, and operator deploy contract.

## Phases

### Phase 29a — Full API oracle corpus (**G7905** — closed)

All **109** native handlers in `api-proxy.cwl` lifted from oracle goldens (`fixtures/hub-wisp-management/wisp-api-goldens/`) with trace replay **correctness 1.0**.

**Commands:** `pnpm run wisp:api-trace-capture-all`, `pnpm run wisp:apply-api-golden-handlers`, `pnpm run wisp:api-trace-replay-verify`  
**Close:** `pnpm run hub:wisp-production-completion-api-replay-smoke`

### Phase 29b — CWL static export (**G7904** — closed)

Export **87** `@page` routes from `routes.cwl` to `fixtures/hub-wisp-management/cwl-static-export/` for Firebase Hosting charter.

**Command:** `pnpm run wisp:cwl-static-export`  
**Firebase deploy staging:** `pnpm run wisp:stage:firebase-static` (copies export → `Module_Manager/build/client`)  
**Close:** `pnpm run hub:wisp-production-completion-static-export-smoke`

### Phase 29c — Operator deploy contract (**G7906** — closed)

Operator verify script + demo manifest aligned post-G7890; live GCE deploy remains operator-run (`wisp:deploy:gce` + `wisp:operator-verify -- --require`).

**Close:** `pnpm run hub:wisp-production-completion-operator-smoke`

### Program close (**G7990** — closed)

Phases **29a–29c** green + **G7890** regression subordinate.

**Smoke:** `pnpm run hub:wisp-production-completion-close-smoke`

## Gates

| ID | Gate | Smoke |
| --- | --- | --- |
| **G7900** | Program entry | `hub:wisp-production-completion-program-entry-smoke` |
| **G7905** | Full API oracle replay | `hub:wisp-production-completion-api-replay-smoke` |
| **G7904** | CWL static export | `hub:wisp-production-completion-static-export-smoke` |
| **G7906** | Operator contract | `hub:wisp-production-completion-operator-smoke` |
| **G7990** | **Completion close** | `hub:wisp-production-completion-close-smoke` |
| **G7991** | Post-close governance | `hub:maintenance-mode-governance-smoke` |

**G7990 regression:** `pnpm run hub:wisp-production-completion-close-smoke` (includes **G7890**).
