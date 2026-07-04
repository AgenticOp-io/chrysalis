# Phase 44 — Extended matrix, LLM hole closure, Horizon C

> **Status:** **Program closed** (2026-07-04, **G9140**) — **169/601** oracle-product (72 core + 97 extended); honest partial census; was **active** (**G9000**, **D6310** — user-amended)  
> **Authority:** **DESIGN D6310**; extends closed **Phase 41** (**G8790**), **Phase 43** (**G8940**)  
> **Requires:** **G8790** core 72/72 oracle-product; **G8940** LLM convert full closed; **G8550** maintenance green  
> **Subordinate to:** **G8550** / **G8570** / **G6731**

## Thesis

Close the **honest product gaps** left after Phase 41/43 — without bypassing WebIR/oracle/verify:

| Track | Scope | Close gate |
| --- | --- | --- |
| **44a** | Extended hub matrix oracle promotion (601-pair census + waves) | **G9085** (wave 3); ongoing waves maintenance |
| **44b** | LLM/stub hole-closure hints → `@chrysalis/repair` | **G9070** |
| **44c** | Horizon C in-repo QLoRA train loop (sponsor GPU operator path) | **G9130** |
| **44d** | Operator hub UI (census + hole-closure) | **G9121** |
| **44e** | Program close composite | **G9140** |

**Charter invariant:** *Models propose; WebIR + oracle + verify dispose.*

## 44a — Extended matrix oracle (G9000–G9030)

Phase 41 closed **72/72** core 9×9 pairs. Phase 44 promotes **non-core** hub pairs (file-lift, pattern-lift, extended origins) to **oracle product** in **waves** — never marketing all 601 as production-ready.

| Gate | Smoke |
| --- | --- |
| **G9000** | `hub:phase44-program-entry-smoke` |
| **G9001** | `hub:extended-matrix-oracle-progress-smoke` — 601-pair census |
| **G9010** | `hub:extended-matrix-oracle-wave1-smoke` — wave-1 charter + coverage |
| **G9020** | `hub:extended-matrix-oracle-wave2-smoke` — wave-2 pattern-lift + CWL |
| **G9030** | `hub:extended-matrix-oracle-wave1-close-smoke` — wave-1 oracle promotion bar |
| **G9040** | `hub:extended-matrix-oracle-wave2-close-smoke` — wave-2 promotion bar |
| **G9080** | `hub:extended-matrix-oracle-wave3-smoke` — wave-3 C/C++/SCSS file-lift |
| **G9085** | `hub:extended-matrix-oracle-wave3-close-smoke` — wave-3 promotion bar |

Charter: `fixtures/hub-extended-matrix-oracle/chrysalis.extended-matrix-charter.v1.json`

## 44b — LLM hole closure (G9050–G9070)

Wire convert enrich → **hole-closure patch hints** (with `holeId`) → existing **G8913** repair bridge after verify + operator confirm.

| Gate | Smoke |
| --- | --- |
| **G9051** | `hub:llm-convert-hole-closure-smoke` |
| **G9070** | `hub:llm-convert-hole-closure-close-smoke` — enrich + verify-gated apply + repair bridge |

**Refused:** auto-apply hole closure without verify + operator confirm; string transpile without WebIR.

## 44c — Horizon C QLoRA train loop (G9100–G9130)

In-repo **train plan + QLoRA entry script**; GPU spend remains **operator-run** on `chrysalis-gpu-lab`.

| Gate | Smoke |
| --- | --- |
| **G9100** | `hub:horizon-c-program-entry-smoke` |
| **G9110** | `hub:horizon-c-train-loop-smoke` — manifest + dry-run plan |
| **G9130** | `hub:horizon-c-train-close-smoke` — operator contract (+ `reports/ci/gce-gpu-lab.ok` when strict) |

## 44d — Operator hub UI (G9121)

| Gate | Smoke |
| --- | --- |
| **G9121** | `hub:phase44-ui-smoke` — extended matrix census + hole-closure on console |

## 44e — Program close (G9140)

| Gate | Smoke |
| --- | --- |
| **G9140** | `hub:phase44-program-close-smoke` — all track closes + honest 601-pair census (not full promotion) |

## Closed census (2026-07-04)

| Metric | Value |
| --- | --- |
| Hub directed pairs | **601** |
| Oracle product | **169** (72 core + 97 extended) |
| Below target | **432** (maintenance waves — not production parity claim) |

Wave closes **G9030**, **G9040**, **G9085**; hole closure **G9070**; Horizon C operator contract **G9130**; operator UI **G9121**.

## Regression

- **G9140** `hub:phase44-program-close-smoke` — program composite
- **G8790** `hub:full-matrix-oracle-close-smoke`
- **G8940** `hub:llm-convert-full-close-smoke`
- **G8550** maintenance
