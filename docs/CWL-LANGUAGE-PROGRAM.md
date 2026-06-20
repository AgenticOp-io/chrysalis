# CWL language program

> **Status:** **Language v1 closed** (2026-06-19, **G6750**)  
> **Authority:** `docs/CWL-SURFACE-TAXONOMY.md` (**D6193**); `docs/CWL.md`; `docs/CWL-RFC.md`

Chrysalis Web Language (CWL) is the **consolidated web language** for routes, pages, data loaders, effects metadata, and (future) UI composition — all lowering through **WebIR** to emit targets and oracle verify.

**CWL is authoritative.** The WISP showcase POC exists solely to demonstrate CWL on a real app — it does **not** define the language (**D6205**).

This program defines what **“language v1 complete”** means in-repo. It is **not** a claim that every PHP construct or every React/Svelte widget is lowered.

## Language v1 — complete (G6750)

| Layer | Scope | Status |
| --- | --- | --- |
| **CWL API** | RFC-0001–0008 (`@route`, params, body, status, content-type, `use`) | **Shipped** — hub gold + verify |
| **CWL Pages** | RFC-0010/0011/0014 (`@page`, layouts, HTML interpolation) | **Shipped** |
| **CWL Data** | RFC-0013 (`load { }`) | **Shipped** — page loaders on flagship + WISP |
| **CWL Effects** | RFC-0007 + WISP M6 `session.read` metadata | **Declarative shipped** |
| **CWL UI** | RFC-0012 component holes | **Explicit holes** — not v1; no silent lowering |
| **IR helper B-tier** | B5.5–B8 formal-assign lib SQL inlining | **Closed** — `empty`, `isset`, casts, trim, strlen |
| **IR helper B9+** | Incremental v1.1 depth | **Active** — `count()` (**G6760**), `is_array()` (**G6770**), `is_string()` (**G6780**), `abs()` (**G6790**), `is_numeric()` (**G6800**), logical **`!`** (**G6810**) |
| **Probes** | RFC-0015/0016 production + form-action hole catalog | **Shipped** — regression gates |

## Explicitly not “language v1”

Per **DESIGN §3** and **D6205**:

- **CWL UI** — Svelte/React/ArcGIS/Firebase widgets remain **holes** until a future RFC + verify program
- **Backend replatform** — WISPTools Express/Mongo stays proxied; CWL replaces **web language**, not databases
- **575×26 matrix marketing depth** — structural/oracle parity only where gated

## Gates

| ID | Gate | Smoke |
| --- | --- | --- |
| G6340 | Surface taxonomy | `pnpm run hub:cwl-surface-taxonomy-smoke` |
| G6731 | Language maintenance regression | `pnpm run hub:cwl-language-maintenance-smoke` |
| G6730 | B7 `empty()` formal assign | `runIrHelperLiftingB7EmptyInlineGate` |
| G6740 | B8 `isset()` formal assign | `runIrHelperLiftingB8IssetInlineGate` |
| G6760 | B9 `count()` formal assign | `runIrHelperLiftingB9CountInlineGate` |
| G6770 | B10 `is_array()` formal assign | `runIrHelperLiftingB10IsArrayInlineGate` |
| G6780 | B11 `is_string()` formal assign | `runIrHelperLiftingB11IsStringInlineGate` |
| G6790 | B12 `abs()` formal assign | `runIrHelperLiftingB12AbsInlineGate` |
| G6800 | B13 `is_numeric()` formal assign | `runIrHelperLiftingB13IsNumericInlineGate` |
| G6810 | B14 logical `!` formal assign | `runIrHelperLiftingB14NotInlineGate` |
| **G6750** | **Language v1 program close** | `pnpm run hub:cwl-language-v1-close-smoke` |

## Language v1.1 — active (G6760–G6810)

Post-v1 incremental IR helper depth on the **same B-tier pattern** (formal-assign lib SQL inlining). Does not reopen v1 surface scope; extends ingest/emit helper lifting only.

Regression: `pnpm run hub:cwl-language-maintenance-smoke` (**G6731**, includes **G6760** B9 through **G6810** B14).

## Default queue after close

Reactive **language maintenance** only — see [`PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) §2.

Regression: `pnpm run hub:cwl-language-v1-close-smoke` (**G6750**), `pnpm run hub:cwl-language-maintenance-smoke` (**G6731**).

Future **CWL UI** depth requires a new RFC program and strategic plan amendment — not maintenance drift.
