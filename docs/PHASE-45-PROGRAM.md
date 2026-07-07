# Phase 45 — Chrysalis CWL product supremacy

> **Status:** **Program closed** (2026-07-06, **G9190**) — **178/601** oracle-product; was **active** (**G9150**, **D6336**)  
> **Authority:** **DESIGN D6336**; supersedes maintenance-only default queue post **G9140**  
> **Requires:** **G9140** Phase 44 closed; **G7200** IR helper closed; **G8550** Migration OS closed  
> **North star:** **CWL is authoritative**; WISP exists solely to **showcase** CWL on a real app — wins must **generalize**.

## Thesis

Chrysalis default build prioritizes **CWL product evidence** above maintenance-only regression:

| Track | Scope | Gate |
| --- | --- | --- |
| **45a** | Extended matrix oracle wave maintenance (**432/601** gap at program open; **601/601** after post-close waves **8–16**) | **G9160** |
| **45b** | WISP Module_Manager showcase in **default CI** (**D6336** supersedes **D6259** default-build bar) | **G9170** |
| **45c** | Product supremacy build slice (entry + census + showcase + closed-program regression index) | **G9180** |
| **45d** | CWL language + IR helper tiers — **first-class**, not optional subordinate | **G6731** / **G7200** |
| **45e** | Program close composite | **G9190** |

**Charter invariant:** *Models propose; WebIR + oracle + verify dispose.* WISP is showcase — not the definition of CWL.

## 45a — Extended matrix maintenance (G9160)

Continue Phase 44 wave maintenance without claiming 601-pair production parity.

| Gate | Smoke |
| --- | --- |
| **G9160** | `hub:extended-matrix-oracle-progress-smoke` — 601-pair census + wave index |
| **G9165** | `hub:extended-matrix-oracle-wave4-smoke` — wave-4 Vue/Svelte component-lift |
| **G9166** | `hub:extended-matrix-oracle-wave4-close-smoke` — wave-4 promotion bar |
| **G9175** | `hub:extended-matrix-oracle-wave5-smoke` — wave-5 config-lift × CWL |
| **G9176** | `hub:extended-matrix-oracle-wave5-close-smoke` — wave-5 promotion bar |

Charter: `fixtures/hub-extended-matrix-oracle/chrysalis.extended-matrix-charter.v1.json`

## 45b — WISP showcase default CI (G9170)

Re-couple WISP CWL showcase regression to default CI/build (**D6336**). Weekly **`wisp-poc-regression`** remains for extended operator path.

| Gate | Smoke |
| --- | --- |
| **G9170** | `hub:phase45-wisp-showcase-smoke` — WISP maintenance regression (**G6710**) |

Detail: [`WISP-CWL-FULLSTACK-PROGRAM.md`](./WISP-CWL-FULLSTACK-PROGRAM.md)

## 45c — Product supremacy build slice (G9180)

| Gate | Smoke |
| --- | --- |
| **G9150** | `hub:phase45-program-entry-smoke` |
| **G9180** | `hub:phase45-build-slice-smoke` — entry + census + showcase |

**Closed program regression (subordinate, mandatory in default CI):** `hub:phase44-program-close-smoke` (**G9140**) · `hub:ir-helper-program-close-smoke` (**G7200**) · `hub:migration-os-close-smoke` (**G8550**)

## 45e — Program close (G9190)

Future close when extended matrix wave 4+ bar, WISP showcase CI, and product regression composite are stable.

| Gate | Smoke |
| --- | --- |
| **G9190** | `hub:phase45-program-close-smoke` |
| **G9185** | `hub:phase45-program-complete-smoke` — close + G7200 + G8550 regression |

## Closed census (2026-07-06)

| Metric | Value |
| --- | --- |
| Hub directed pairs | **601** |
| Oracle product | **178** (72 core + 106 extended) |
| Below target | **423** (wave maintenance — not production parity claim) |

Wave closes **G9166**, **G9176**; WISP showcase **G9170**; product slice **G9180**; program close **G9190**.
