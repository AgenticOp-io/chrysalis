# Chrysalis - Roadmap

> Read `DESIGN.md` first. This file is the **active** execution plan.
> Completed history is archived in [`ROADMAP-ARCHIVE.md`](./ROADMAP-ARCHIVE.md).

## Status (2026-06)

- **Releases:** `v1.0.0` -> `v2.0.x` tagged on `main`.
- **Active lane:** **Phase 15 — CWL complete language** (**D6206**, **G7100** entry, **G7150** program close).
- **Subordinate:** **CWL language v1.1** IR helper maintenance (**G6731**, B9–B38 **G6760–G7050**).
- **Closed:** **CWL language v1** (**G6750**); **Phase 14** (**G6690**); **Phase 13** (**G6410**); **Phase 12 WISP Phase 0** (**G6310**).
- **Recently shipped:** Plan amendment **D6206**; Phase 15 entry **G7101**; CWL UI v0 **G7111** (`return ui`, `data.ui.tree`).

---

## Active — Phase 15 CWL complete language (G7100–G7150)

Program doc: [`docs/CWL-LANGUAGE-PROGRAM.md`](./docs/CWL-LANGUAGE-PROGRAM.md) § Complete language program  
Authority: **DESIGN D6206**; [`docs/STRATEGIC-PLAN.md`](./docs/STRATEGIC-PLAN.md) §7

| Phase | Gate | Target |
| --- | --- | --- |
| **15** UI v0 | **G7110** | Native CWL component syntax + verify (extends RFC-0012) |
| **16** Data complete | **G7120** | RFC-0013 load shapes; retire load holes on charter |
| **17** Effects executable | **G7130** | RFC-0007 runtime parity |
| **18** Cutover / greenfield | **G7140** | Ladder step 5 — chimera-out for app logic |
| **Program close** | **G7150** | All five surfaces; hole budget zero on flagship |

**Default when user says "build":** Phase **15** first (RFC → WebIR → gates → WISP proof).

**Shipped (Phase 15 slice):** RFC-0017 native UI v0 — `return ui { element … }` → `data.ui.tree`; smokes **G7101**, **G7111** (`pnpm run hub:cwl-ui-v0-smoke`).

**Close target G7110:** WISP `/login` native UI + component reuse (queued).

**Subordinate maintenance:** `pnpm run hub:cwl-language-maintenance-smoke` (**G6731**)

**Regression:** `pnpm run hub:wisp-cwl-phase13-close-smoke` (**G6410**), Phase 14 operator smokes (**G6690** / **G6590**)

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
| G6820 B15 `is_int()` | `runIrHelperLiftingB15IsIntInlineGate` |
| G6830 B16 `is_bool()` | `runIrHelperLiftingB16IsBoolInlineGate` |
| G6840 B17 `is_null()` | `runIrHelperLiftingB17IsNullInlineGate` |
| G6850 B18 unary `-` | `runIrHelperLiftingB18NegInlineGate` |
| G6860 B19 `round()` | `runIrHelperLiftingB19RoundInlineGate` |
| G6870 B20 `floor()` | `runIrHelperLiftingB20FloorInlineGate` |
| G6880 B21 `ceil()` | `runIrHelperLiftingB21CeilInlineGate` |
| G6890 B22 `strtolower()` | `runIrHelperLiftingB22StrtolowerInlineGate` |
| G6900 B23 `strtoupper()` | `runIrHelperLiftingB23StrtoupperInlineGate` |
| G6910 B24 `htmlspecialchars()` | `runIrHelperLiftingB24HtmlspecialcharsInlineGate` |
| G6920 B25 `nl2br()` | `runIrHelperLiftingB25Nl2brInlineGate` |
| G6930 B26 `urlencode()` | `runIrHelperLiftingB26UrlencodeInlineGate` |
| G6940 B27 `rawurlencode()` | `runIrHelperLiftingB27RawurlencodeInlineGate` |
| G6950 B28 `urldecode()` | `runIrHelperLiftingB28UrldecodeInlineGate` |
| G6960 B29 `rawurldecode()` | `runIrHelperLiftingB29RawurldecodeInlineGate` |
| G6970 B30 `ltrim()` | `runIrHelperLiftingB30LtrimInlineGate` |
| G6980 B31 `rtrim()` | `runIrHelperLiftingB31RtrimInlineGate` |
| G6990 B32 `is_float()` | `runIrHelperLiftingB32IsFloatInlineGate` |
| G7000 B33 `is_object()` | `runIrHelperLiftingB33IsObjectInlineGate` |
| G7010 B34 `is_scalar()` | `runIrHelperLiftingB34IsScalarInlineGate` |
| G7020 B35 `round(, precision)` | `runIrHelperLiftingB35Round2InlineGate` |
| G7030 B36 `max(, literal)` | `runIrHelperLiftingB36MaxInlineGate` |
| G7040 B37 `min(, literal)` | `runIrHelperLiftingB37MinInlineGate` |
| G7050 B38 `substr(, literal)` | `runIrHelperLiftingB38SubstrInlineGate` |
| **G6750 close** | `pnpm run hub:cwl-language-v1-close-smoke` |

## Active — CWL language v1.1 (G6760–G7050)

Incremental IR helper depth after v1 close. Program doc: [`docs/CWL-LANGUAGE-PROGRAM.md`](./docs/CWL-LANGUAGE-PROGRAM.md) § Language v1.1.

| Gate | Smoke |
| --- | --- |
| **G6760** B9 `count()` | `runIrHelperLiftingB9CountInlineGate` (via **G6731**) |
| **G6770** B10 `is_array()` | `runIrHelperLiftingB10IsArrayInlineGate` (via **G6731**) |
| **G6780** B11 `is_string()` | `runIrHelperLiftingB11IsStringInlineGate` (via **G6731**) |
| **G6790** B12 `abs()` | `runIrHelperLiftingB12AbsInlineGate` (via **G6731**) |
| **G6800** B13 `is_numeric()` | `runIrHelperLiftingB13IsNumericInlineGate` (via **G6731**) |
| **G6810** B14 logical `!` | `runIrHelperLiftingB14NotInlineGate` (via **G6731**) |
| **G6820** B15 `is_int()` | `runIrHelperLiftingB15IsIntInlineGate` (via **G6731**) |
| **G6830** B16 `is_bool()` | `runIrHelperLiftingB16IsBoolInlineGate` (via **G6731**) |
| **G6840** B17 `is_null()` | `runIrHelperLiftingB17IsNullInlineGate` (via **G6731**) |
| **G6850** B18 unary `-` | `runIrHelperLiftingB18NegInlineGate` (via **G6731**) |
| **G6860** B19 `round()` | `runIrHelperLiftingB19RoundInlineGate` (via **G6731**) |
| **G6870** B20 `floor()` | `runIrHelperLiftingB20FloorInlineGate` (via **G6731**) |
| **G6880** B21 `ceil()` | `runIrHelperLiftingB21CeilInlineGate` (via **G6731**) |
| **G6890** B22 `strtolower()` | `runIrHelperLiftingB22StrtolowerInlineGate` (via **G6731**) |
| **G6900** B23 `strtoupper()` | `runIrHelperLiftingB23StrtoupperInlineGate` (via **G6731**) |
| **G6910** B24 `htmlspecialchars()` | `runIrHelperLiftingB24HtmlspecialcharsInlineGate` (via **G6731**) |
| **G6920** B25 `nl2br()` | `runIrHelperLiftingB25Nl2brInlineGate` (via **G6731**) |
| **G6930** B26 `urlencode()` | `runIrHelperLiftingB26UrlencodeInlineGate` (via **G6731**) |
| **G6940** B27 `rawurlencode()` | `runIrHelperLiftingB27RawurlencodeInlineGate` (via **G6731**) |
| **G6950** B28 `urldecode()` | `runIrHelperLiftingB28UrldecodeInlineGate` (via **G6731**) |
| **G6960** B29 `rawurldecode()` | `runIrHelperLiftingB29RawurldecodeInlineGate` (via **G6731**) |
| **G6970** B30 `ltrim()` | `runIrHelperLiftingB30LtrimInlineGate` (via **G6731**) |
| **G6980** B31 `rtrim()` | `runIrHelperLiftingB31RtrimInlineGate` (via **G6731**) |
| **G6990** B32 `is_float()` | `runIrHelperLiftingB32IsFloatInlineGate` (via **G6731**) |
| **G7000** B33 `is_object()` | `runIrHelperLiftingB33IsObjectInlineGate` (via **G6731**) |
| **G7010** B34 `is_scalar()` | `runIrHelperLiftingB34IsScalarInlineGate` (via **G6731**) |
| **G7020** B35 `round(, precision)` | `runIrHelperLiftingB35Round2InlineGate` (via **G6731**) |
| **G7030** B36 `max(, literal)` | `runIrHelperLiftingB36MaxInlineGate` (via **G6731**) |
| **G7040** B37 `min(, literal)` | `runIrHelperLiftingB37MinInlineGate` (via **G6731**) |
| **G7050** B38 `substr(, literal)` | `runIrHelperLiftingB38SubstrInlineGate` (via **G6731**) |

---

## Default queue — CWL language v1.1 (subordinate)

**Phase 15 active (D6206).** IR helper depth **B9–B38** (**G6760–G7050**) continues via **G6731** — subordinate to complete-language phases. See [`PAUSED-AND-MAINTENANCE.md`](./docs/PAUSED-AND-MAINTENANCE.md) §2.

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
