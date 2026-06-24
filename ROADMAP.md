# Chrysalis - Roadmap

> Read `DESIGN.md` first. This file is the **active** execution plan.
> Completed history is archived in [`ROADMAP-ARCHIVE.md`](./ROADMAP-ARCHIVE.md).

## Status (2026-06)

- **Releases:** `v1.0.0` -> `v2.0.x` tagged on `main`.
- **Active lane:** **Maintenance** — **G7390** universal language regression (**D6260** program **closed** 2026-06-24).
- **Shipped milestones:** **G7150** complete language; **G7200** IR Helper; **G6750** language v1.
- **WISP POC:** **optional** regression only — decoupled from default CI/build (**D6259**).

---

## Closed — CWL universal web language (G7390)

Program doc: [`docs/CWL-UNIVERSAL-LANGUAGE-PROGRAM.md`](./docs/CWL-UNIVERSAL-LANGUAGE-PROGRAM.md)  
Authority: **DESIGN D6260** / **D6261**

| Phase | Goal | Close gate | Smoke |
| --- | --- | --- | --- |
| **19** | CWL UI v1 — islands, events, verify | **G7310** | `pnpm run hub:cwl-phase19-close-smoke` |
| **20** | CWL Data v2 — load redirect/error, load+UI | **G7320** | `pnpm run hub:cwl-phase20-close-smoke` |
| **21** | CWL Effects middleware | **G7330** | `pnpm run hub:cwl-phase21-close-smoke` |
| **22** | Universal ingest — pilot ≥99% native CWL | **G7340** | `pnpm run hub:cwl-phase22-close-smoke` |
| **23** | Greenfield cutover — CWL-only template | **G7350** | `pnpm run hub:cwl-phase23-close-smoke` |
| **Program** | Universal web language close | **G7390** | `pnpm run hub:cwl-universal-language-close-smoke` |

**Default regression:** `pnpm run hub:cwl-universal-language-close-smoke` (**G7390**).

---

## Archived — Phase 19 entry (G7300, superseded by G7390 close)

## Closed — IR Helper Program v1 (G7200)

**Authority:** [`docs/IR-HELPER-PROGRAM.md`](./docs/IR-HELPER-PROGRAM.md) (not CWL language).

| Gate | Smoke |
| --- | --- |
| **G7200** Program close | `pnpm run hub:ir-helper-program-close-smoke` |
| **G2303–G2304** Semantic + replay twins | via G7200 composite |
| **G6731** Tier regression (optional) | `pnpm run hub:cwl-language-maintenance-smoke` |

**Track A:** B0–B5.5 cross-file lift baseline closed.  
**Track B:** Body shapes I0–I5 + **74** I3 inline callees; holes H1–H2 documented.

---

## Closed — Phase 15–18 CWL complete language (G7110–G7150)

Program doc: [`docs/CWL-LANGUAGE-PROGRAM.md`](./docs/CWL-LANGUAGE-PROGRAM.md) § Complete language program  
Authority: **DESIGN D6206–D6208**; [`docs/STRATEGIC-PLAN.md`](./docs/STRATEGIC-PLAN.md) §7

| Phase | Gate | Smoke |
| --- | --- | --- |
| **15** UI v0 | **G7110** | `pnpm run hub:cwl-phase15-close-smoke` |
| **16** Data | **G7120** | `pnpm run hub:cwl-data-complete-smoke` |
| **17** Effects | **G7130** | `pnpm run hub:cwl-effects-executable-smoke` |
| **18** Cutover | **G7140** | `pnpm run hub:cwl-cutover-smoke` |
| **Program** | **G7150** | `pnpm run hub:cwl-complete-language-close-smoke` |

**Shipped:** RFC-0017 `return ui` + RFC-0018 `@component`; executable `session.read`/`session.write` lowering; WISP `/login` bridge policy ([`docs/CWL-UI-LOGIN-BRIDGE.md`](./docs/CWL-UI-LOGIN-BRIDGE.md)).

**Subordinate maintenance:** `pnpm run hub:cwl-language-maintenance-smoke` (**G6731**)

---

## Closed — Phase 12 WISP Phase 0 (G6310)

**WISP POC optional** — not in default build (**D6259**). Regression: [`PAUSED-AND-MAINTENANCE.md`](./docs/PAUSED-AND-MAINTENANCE.md) §1a.

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
| G7060 B39 `strpos(, literal)` | `runIrHelperLiftingB39StrposInlineGate` |
| G7070 B40 `stripos(, literal)` | `runIrHelperLiftingB40StriposInlineGate` |
| G7080 B41 `strrpos(, literal)` | `runIrHelperLiftingB41StrrposInlineGate` |
| G7090 B42 `strripos(, literal)` | `runIrHelperLiftingB42StrriposInlineGate` |
| G7091 B43 `str_contains(, literal)` | `runIrHelperLiftingB43StrContainsInlineGate` |
| G7092 B44 `str_starts_with(, literal)` | `runIrHelperLiftingB44StrStartsWithInlineGate` |
| G7093 B45 `str_ends_with(, literal)` | `runIrHelperLiftingB45StrEndsWithInlineGate` |
| G7094 B46 `substr_count(, literal)` | `runIrHelperLiftingB46SubstrCountInlineGate` |
| G7095 B47 `explode(, literal)` | `runIrHelperLiftingB47ExplodeInlineGate` |
| G7096 B48 `strcmp(, literal)` | `runIrHelperLiftingB48StrcmpInlineGate` |
| G7097 B49 `strcasecmp(, literal)` | `runIrHelperLiftingB49StrcasecmpInlineGate` |
| G7098 B50 `strncmp(, literal, literal)` | `runIrHelperLiftingB50StrncmpInlineGate` |
| G7099 B51 `strncasecmp(, literal, literal)` | `runIrHelperLiftingB51StrncasecmpInlineGate` |
| G7102 B52 `strrev()` | `runIrHelperLiftingB52StrrevInlineGate` |
| G7103 B53 `str_repeat(, literal)` | `runIrHelperLiftingB53StrRepeatInlineGate` |
| G7104 B54 `str_pad(, literal, literal)` | `runIrHelperLiftingB54StrPadInlineGate` |
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
| **G7060** B39 `strpos(, literal)` | `runIrHelperLiftingB39StrposInlineGate` (via **G6731**) |
| **G7070** B40 `stripos(, literal)` | `runIrHelperLiftingB40StriposInlineGate` (via **G6731**) |
| **G7080** B41 `strrpos(, literal)` | `runIrHelperLiftingB41StrrposInlineGate` (via **G6731**) |
| **G7090** B42 `strripos(, literal)` | `runIrHelperLiftingB42StrriposInlineGate` (via **G6731**) |
| **G7091** B43 `str_contains(, literal)` | `runIrHelperLiftingB43StrContainsInlineGate` (via **G6731**) |
| **G7092** B44 `str_starts_with(, literal)` | `runIrHelperLiftingB44StrStartsWithInlineGate` (via **G6731**) |
| **G7093** B45 `str_ends_with(, literal)` | `runIrHelperLiftingB45StrEndsWithInlineGate` (via **G6731**) |
| **G7094** B46 `substr_count(, literal)` | `runIrHelperLiftingB46SubstrCountInlineGate` (via **G6731**) |
| **G7095** B47 `explode(, literal)` | `runIrHelperLiftingB47ExplodeInlineGate` (via **G6731**) |
| **G7096** B48 `strcmp(, literal)` | `runIrHelperLiftingB48StrcmpInlineGate` (via **G6731**) |
| **G7097** B49 `strcasecmp(, literal)` | `runIrHelperLiftingB49StrcasecmpInlineGate` (via **G6731**) |
| **G7098** B50 `strncmp(, literal, literal)` | `runIrHelperLiftingB50StrncmpInlineGate` (via **G6731**) |
| **G7099** B51 `strncasecmp(, literal, literal)` | `runIrHelperLiftingB51StrncasecmpInlineGate` (via **G6731**) |
| **G7102** B52 `strrev()` | `runIrHelperLiftingB52StrrevInlineGate` (via **G6731**) |
| **G7103** B53 `str_repeat(, literal)` | `runIrHelperLiftingB53StrRepeatInlineGate` (via **G6731**) |
| **G7104** B54 `str_pad(, literal, literal)` | `runIrHelperLiftingB54StrPadInlineGate` (via **G6731**) |

---

## Default queue — universal language closed (G7390)

**Regression:** `pnpm run hub:cwl-universal-language-close-smoke` (**G7390**).
**Subordinate:** **G7150** + **G7200** (included in G7390 composite).
**Optional:** `pnpm run hub:cwl-language-maintenance-smoke` (**G6731**); WISP POC — [`PAUSED-AND-MAINTENANCE.md`](./docs/PAUSED-AND-MAINTENANCE.md) §1a.

**Governance:** `pnpm run hub:maintenance-mode-governance-smoke`

Closed programs: Phase 10–18 (**G7150**), IR Helper v1 (**G7200**), WISP showcase POC (**G6690**, optional).

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
