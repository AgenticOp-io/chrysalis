# Phase 44 — Extended matrix, LLM hole closure, Horizon C

> **Status:** **active** (2026-07-04, **G9000**, **D6310** — user-amended)  
> **Authority:** **DESIGN D6310**; extends closed **Phase 41** (**G8790**), **Phase 43** (**G8940**)  
> **Requires:** **G8790** core 72/72 oracle-product; **G8940** LLM convert full closed; **G8550** maintenance green  
> **Subordinate to:** **G8550** / **G8570** / **G6731**

## Thesis

Close the **honest product gaps** left after Phase 41/43 — without bypassing WebIR/oracle/verify:

| Track | Scope | Close gate |
| --- | --- | --- |
| **44a** | Extended hub matrix oracle promotion (601-pair census + waves) | **G9030** |
| **44b** | LLM/stub hole-closure hints → `@chrysalis/repair` | **G9070** |
| **44c** | Horizon C in-repo QLoRA train loop (sponsor GPU operator path) | **G9130** |
| **44d** | Program close composite | **G9140** |

**Charter invariant:** *Models propose; WebIR + oracle + verify dispose.*

## 44a — Extended matrix oracle (G9000–G9030)

Phase 41 closed **72/72** core 9×9 pairs. Phase 44 promotes **non-core** hub pairs (file-lift, pattern-lift, extended origins) to **oracle product** in **waves** — never marketing all 601 as production-ready.

| Gate | Smoke |
| --- | --- |
| **G9000** | `hub:phase44-program-entry-smoke` |
| **G9001** | `hub:extended-matrix-oracle-progress-smoke` — 601-pair census |
| **G9010** | `hub:extended-matrix-oracle-wave1-smoke` — wave-1 charter + coverage |
| **G9030** | Wave-1 oracle promotion bar (charter `wave1MinOraclePairs`) |

Charter: `fixtures/hub-extended-matrix-oracle/chrysalis.extended-matrix-charter.v1.json`

## 44b — LLM hole closure (G9050–G9070)

Wire convert enrich → **hole-closure patch hints** (with `holeId`) → existing **G8913** repair bridge after verify + operator confirm.

| Gate | Smoke |
| --- | --- |
| **G9051** | `hub:llm-convert-hole-closure-smoke` |
| **G9070** | Composed in build slice |

**Refused:** auto-apply hole closure without verify + operator confirm; string transpile without WebIR.

## 44c — Horizon C QLoRA train loop (G9100–G9130)

In-repo **train plan + QLoRA entry script**; GPU spend remains **operator-run** on `chrysalis-gpu-lab`.

| Gate | Smoke |
| --- | --- |
| **G9100** | `hub:horizon-c-program-entry-smoke` |
| **G9110** | `hub:horizon-c-train-loop-smoke` — manifest + dry-run plan |
| **G9130** | Real GPU train (operator; `CHRYSALIS_GPU_LAB_DRY_RUN=0`) — not CI default |

## Regression

- **G8790** `hub:full-matrix-oracle-close-smoke`
- **G8940** `hub:llm-convert-full-close-smoke`
- **G8550** maintenance
