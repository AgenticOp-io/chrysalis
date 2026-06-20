# Chrysalis - Roadmap

> Read `DESIGN.md` first. This file is the **active** execution plan.
> Completed history is archived in [`ROADMAP-ARCHIVE.md`](./ROADMAP-ARCHIVE.md).

## Status (2026-06)

- **Releases:** `v1.0.0` -> `v2.0.x` tagged on `main`.
- **Active lanes:** **CWL language v1.1** (B9 **G6760**); **CWL language v1 closed** (**G6750**); **Phase 14 closed** (**G6690**); **Phase 13 closed** (**G6410**); **Phase 12 WISP Phase 0 closed** (**G6310**).
- **Recently shipped:** B14 logical `!` IR helper inlining (**G6810**); B13 `is_numeric()` (**G6800**); B12 `abs()` (**G6790**).

---

## Closed — Phase 12 WISP Phase 0 (G6310)

Program doc: [`docs/WISP-CWL-FULLSTACK-PROGRAM.md`](./docs/WISP-CWL-FULLSTACK-PROGRAM.md)

| Gate | Smoke |
| --- | --- |
| G6304 entry | `pnpm run hub:wisp-cwl-phase12-phase0-entry-smoke` |
| **G6310 close** | `pnpm run hub:wisp-cwl-phase12-phase0-close-smoke` |
| **G6320 pipeline** | `pnpm run hub:wisp-cwl-pipeline-smoke` |
| G6330 dual deploy | `pnpm run hub:wisp-cwl-dual-deploy-config-smoke` |

Deploy/maintenance: `pnpm run wisp:deploy:gce`, `pnpm run wisp:deploy:firebase`, chimera gateway smokes.

---

## Closed — Phase 13 CWL surfaces (G6410)

Taxonomy: [`docs/CWL-SURFACE-TAXONOMY.md`](./docs/CWL-SURFACE-TAXONOMY.md) (**D6193**, **G6340**)

| Gate | Smoke |
| --- | --- |
| **G6340** taxonomy | `pnpm run hub:cwl-surface-taxonomy-smoke` |
| **G6350–G6400** M0–M5 | `pnpm run hub:wisp-cwl-phase13-m0-smoke` … **m5-smoke** |
| **G6420 M6** effects | `pnpm run hub:wisp-cwl-phase13-m6-smoke` |
| **G6410 close** | `pnpm run hub:wisp-cwl-phase13-close-smoke` |

Waves M0→M6 closed all five CWL surfaces on WISP (API contract, Pages, Data, UI holes, Effects metadata). **`/login`** remains the sole UI hole (`hub-svelte:firebase-auth`). Detail: [`WISP-CWL-FULLSTACK-PROGRAM.md`](./docs/WISP-CWL-FULLSTACK-PROGRAM.md) § Module waves.

---

---

## Closed — Phase 14 HSS operator deploy (G6690)

**Authority:** **DESIGN D6204** — [`WISP-CWL-FULLSTACK-PROGRAM.md`](./docs/WISP-CWL-FULLSTACK-PROGRAM.md) § Phase 14

| Gate | Smoke |
| --- | --- |
| **G6500** doc | `runWispCwlProgramDocGate` (Phase 14 + **D6205**) |
| **G6510** client redirects | `pnpm run hub:wisp-cwl-phase14-client-redirect-smoke` |
| **G6520** operator close | `pnpm run hub:wisp-cwl-phase14-operator-close-smoke` |
| **G6530** HSS proxy | `pnpm run hub:wisp-cwl-phase14-hss-proxy-smoke` |
| **G6540** demo manifest | `pnpm run hub:wisp-cwl-phase14-demo-manifest-smoke` |
| **G6600** remote demo verify | `pnpm run hub:wisp-cwl-phase14-remote-demo-smoke` |
| **G6650** pipeline remote verify | `pnpm run hub:wisp-cwl-phase14-pipeline-remote-verify-smoke` |
| **G6680** operator verify | `pnpm run hub:wisp-cwl-phase14-operator-verify-smoke` |
| **G6700** live HSS backend | `pnpm run hub:wisp-cwl-phase14-live-backend-smoke` |
| **G6590** operator readiness | `pnpm run hub:wisp-cwl-phase14-close-smoke` |
| **G6690** program close | `pnpm run hub:wisp-cwl-phase14-program-close-smoke` |
| G6320 | `pnpm run hub:wisp-cwl-pipeline-smoke` |
| G6330 | `pnpm run hub:wisp-cwl-dual-deploy-config-smoke` |
| G6410 regression | `pnpm run hub:wisp-cwl-phase13-close-smoke` |

Deploy/maintenance: `pnpm run wisp:deploy:gce`, `pnpm run wisp:operator-verify`, `pnpm run wisp:verify:demo`.

---

## Archived — Phase 13 CWL surfaces (reference)

| Surface | Syntax | WISP module waves |
| --- | --- | --- |
| CWL API | `@route` | M2–M5 (proxy contract done in Phase 0) |
| CWL Pages | `@page` | M0 docs; M1–M5 interactive pages |
| CWL Data | `load { }` | M1 dashboard; M3 plan/deploy |
| CWL UI | component holes → RFC | M0 login; M1–M5 widgets |
| CWL Effects | `use` / `effects` | Auth, tenant, session (M1–M2) |

| Gate | Smoke |
| --- | --- |
| **G6340** taxonomy | `pnpm run hub:cwl-surface-taxonomy-smoke` |
| **G6350 M0** docs/help/login | `pnpm run hub:wisp-cwl-phase13-m0-smoke` |
| **G6360 M1** dashboard load | `pnpm run hub:wisp-cwl-phase13-m1-smoke` |
| **G6370 M2** admin + customers | `pnpm run hub:wisp-cwl-phase13-m2-smoke` |
| **G6380 M3** plan/deploy/coverage-map | `pnpm run hub:wisp-cwl-phase13-m3-smoke` |
| **G6390 M4** acs/hss/monitor | `pnpm run hub:wisp-cwl-phase13-m4-smoke` |
| **G6400 M5** UI cutover ≥99% | `pnpm run hub:wisp-cwl-phase13-m5-smoke` |

**M0 (shipped):** CWL Pages for all `/docs/*` + `/help`; login UI hole `hub-svelte:firebase-auth`.

**M1 (shipped):** `/dashboard` CWL Data (`load`) + page shell; interactive widgets catalogued as UI holes.

**M2 (shipped):** Admin routes + `/modules/customers` CWL Pages with `load`; `/api/admin` + `/api/customers` in proxy contract; CRM/admin widgets as UI holes.

**M3 (shipped):** `/modules/plan`, `/modules/deploy`, `/modules/coverage-map` CWL Pages with `load`; `/api/plans`, `/api/deploy`, `/api/network` verified; ArcGIS catalogued as `hub-svelte:arcgis-map` client holes.

**M4 (shipped):** HSS + monitoring `@page` shells — POC showcase for CWL Data/Pages on operator modules. Proxy via `/api/hss`, `/api/monitoring`, `/api/snmp`. *(GenieACS/ACS: WISPTools legacy — not POC scope, **D6205**.)*

**M5 (shipped):** All remaining UI routes → native `@page` + `load` (≥99%); `/login` only `hub-svelte:firebase-auth` hole; chimera `*` native prefix.

Module wave detail: [`WISP-CWL-FULLSTACK-PROGRAM.md`](./docs/WISP-CWL-FULLSTACK-PROGRAM.md) § Module waves (Phase 13).

**Close before build:** Phase 13 surface implementation requires **G6310** closed (regression: `hub:wisp-cwl-phase12-phase0-close-smoke`).

---

## Closed — CWL language v1 (G6750)

Program doc: [`docs/CWL-LANGUAGE-PROGRAM.md`](./docs/CWL-LANGUAGE-PROGRAM.md)

| Gate | Smoke |
| --- | --- |
| G6731 maintenance | `pnpm run hub:cwl-language-maintenance-smoke` |
| G6740 B8 `isset()` | `runIrHelperLiftingB8IssetInlineGate` |
| G6760 B9 `count()` | `runIrHelperLiftingB9CountInlineGate` |
| G6770 B10 `is_array()` | `runIrHelperLiftingB10IsArrayInlineGate` |
| G6780 B11 `is_string()` | `runIrHelperLiftingB11IsStringInlineGate` |
| G6790 B12 `abs()` | `runIrHelperLiftingB12AbsInlineGate` |
| G6800 B13 `is_numeric()` | `runIrHelperLiftingB13IsNumericInlineGate` |
| G6810 B14 logical `!` | `runIrHelperLiftingB14NotInlineGate` |
| **G6750 close** | `pnpm run hub:cwl-language-v1-close-smoke` |

## Active — CWL language v1.1 (G6760–G6810)

Incremental IR helper depth after v1 close. Program doc: [`docs/CWL-LANGUAGE-PROGRAM.md`](./docs/CWL-LANGUAGE-PROGRAM.md) § Language v1.1.

| Gate | Smoke |
| --- | --- |
| **G6760** B9 `count()` | `runIrHelperLiftingB9CountInlineGate` (via **G6731**) |
| **G6770** B10 `is_array()` | `runIrHelperLiftingB10IsArrayInlineGate` (via **G6731**) |
| **G6780** B11 `is_string()` | `runIrHelperLiftingB11IsStringInlineGate` (via **G6731**) |
| **G6790** B12 `abs()` | `runIrHelperLiftingB12AbsInlineGate` (via **G6731**) |
| **G6800** B13 `is_numeric()` | `runIrHelperLiftingB13IsNumericInlineGate` (via **G6731**) |
| **G6810** B14 logical `!` | `runIrHelperLiftingB14NotInlineGate` (via **G6731**) |

---

## Default queue — CWL language v1.1

**Language v1 closed (G6750).** Active v1.1 depth: **B9–B14** (**G6760–G6810**) — see [`PAUSED-AND-MAINTENANCE.md`](./docs/PAUSED-AND-MAINTENANCE.md) §2.

**CWL language:** `pnpm run hub:cwl-language-maintenance-smoke` (**G6731**, includes **G6760**), `pnpm run hub:cwl-language-v1-close-smoke` (**G6750**)

**Verify:** `pnpm run hub:wisp-cwl-program-maintenance-complete-smoke` (**G6720**), `pnpm run hub:wisp-cwl-maintenance-regression-smoke` (**G6710**), `pnpm run hub:wisp-cwl-phase14-program-close-smoke` (**G6690**), `pnpm run hub:wisp-cwl-phase14-close-smoke` (**G6590**), `pnpm run hub:wisp-cwl-phase13-close-smoke` (**G6410**), `pnpm run hub:maintenance-mode-governance-smoke`

Closed programs: Phase 10, Phase 11, Phase 14 operator (`docs/WISP-CWL-FULLSTACK-PROGRAM.md`).

---

## Maintenance hygiene

Reactive work (parser probes, hole economics, docs, redaction) — see [`PAUSED-AND-MAINTENANCE.md`](./docs/PAUSED-AND-MAINTENANCE.md) §2.

**Full CI-scale tests:** `pnpm run test:gce` — [`docs/GCE-LOCAL-VERIFY.md`](./docs/GCE-LOCAL-VERIFY.md).

---

## Closed programs (archive only)

| Program | Closed at | Archive |
| --- | --- | --- |
| Strategic plan phases 0–9 | **G6153** | [`docs/STRATEGIC-PLAN.md`](./docs/STRATEGIC-PLAN.md) §7 |
| Phase 10 production parity | **G6257** | [`docs/PRODUCTION-PARITY-PHASE-10.md`](./docs/PRODUCTION-PARITY-PHASE-10.md) |
| Ship log | **G6257** | [`docs/archive/STRATEGIC-PLAN-SHIPPED-LOG.md`](./docs/archive/STRATEGIC-PLAN-SHIPPED-LOG.md) |

Do **not** treat archive tables as active backlog.

Everything shipped before Phase 10 archive is in [`ROADMAP-ARCHIVE.md`](./ROADMAP-ARCHIVE.md).
