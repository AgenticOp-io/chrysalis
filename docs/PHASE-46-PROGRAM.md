# Phase 46 — Matrix waves 6–7 + CWL runtime depth

> **Status:** **Program closed** (2026-07-06, **G9290**) — **180/601** oracle-product; was **active** (**G9250**, **D6341**)  
> **Authority:** **DESIGN D6341** / **D6342** / **D6343**; user-amended locked path  
> **Requires:** **G9190** Phase 45 closed; **G8550** Migration OS closed; **G7200** IR helper closed  
> **North star:** extend **oracle-product census** honestly while deepening **CWL runtimes** (Node emit + browser/worker scaffolds) — verify-gated only.

## Thesis

Phase 46 ran **two parallel tracks** without conflating matrix marketing with runtime claims:

| Track | Scope | Entry | Close |
| --- | --- | --- | --- |
| **46a** | Extended matrix waves **6–7** (601-pair census maintenance) | **G9275** / **G9285** | **G9276** / **G9286** |
| **46b** | CWL runtime depth (emit-runtime-cwl, session replay, browser/worker scaffolds) | **G9210** | **G9220** |
| **46c** | Product build slice + maintenance regression | **G9280** | — |
| **46e** | Program close composite | — | **G9290** |

**Charter invariant:** *Models propose; WebIR + oracle + verify dispose.* Never claim 601/601 production parity.

## 46a — Extended matrix waves 6–7 (G9260)

| Gate | Smoke |
| --- | --- |
| **G9260** | `hub:extended-matrix-oracle-progress-smoke` — census (closed **180/601**) |
| **G9275** | `hub:extended-matrix-oracle-wave6-smoke` — JSON/CSS → CWL trace-replay |
| **G9276** | `hub:extended-matrix-oracle-wave6-close-smoke` |
| **G9285** | `hub:extended-matrix-oracle-wave7-smoke` — JSON/CSS → hono/fastify/TS/JS |
| **G9286** | `hub:extended-matrix-oracle-wave7-close-smoke` |

Charter: `fixtures/hub-extended-matrix-oracle/chrysalis.extended-matrix-charter.v1.json`

## 46b — CWL runtime depth (G9210)

| Gate | Smoke |
| --- | --- |
| **G9200** | `hub:emit-runtime-cwl-smoke` — deployable runtime-cwl emit |
| **G9240** | `hub:cwl-runtime-deploy-smoke` — Dockerfile + vendored runtime stack |
| **G9210** | `hub:phase46-cwl-runtime-depth-smoke` — emit + deploy + session resolve + runtime scaffolds |
| **G9220** | `hub:phase46-cwl-runtime-depth-close-smoke` — depth track close (verify-gated) |

Detail: [`CWL-RUNTIME-DEPTH-PHASE-46.md`](./CWL-RUNTIME-DEPTH-PHASE-46.md)

## 46c — Build slice (G9280)

| Gate | Smoke |
| --- | --- |
| **G9250** | `hub:phase46-program-entry-smoke` |
| **G9280** | `hub:phase46-build-slice-smoke` — entry + census + wave6 + runtime depth + Phase 45 close regression |

**Subordinate maintenance:** **G8550** · **G8570** · **G6731** (weekly) · **G9170** WISP showcase

## 46e — Program close (G9290)

Closed when wave **6–7** bars pass, runtime depth close **G9220** green, and census honestly above Phase 45 floor (not 601/601).

| Gate | Smoke |
| --- | --- |
| **G9290** | `hub:phase46-program-close-smoke` |

## Close census (2026-07-06)

| Metric | Value |
| --- | --- |
| Hub directed pairs | **601** |
| Oracle product | **180** (72 core + 108 extended) |
| Below target | **421** |

Wave **6** promoted **json/css → cwl** (+2). Wave **7** closed **json/css × hono/fastify/typescript/javascript** trace-replay bar (8 pairs).

## Post-close maintenance — extended matrix census (2026-07-06)

Waves **8–16** (maintenance, post–**G9290**) closed the **601-pair oracle-product census** at **601/601** (**D6355–D6357**). Regression: `hub:extended-matrix-oracle-progress-smoke` (**G9160**) + per-wave smokes **G9161**–**G9172**. This does **not** revise the Phase 46 program close record above (**180/601** at **G9290**).

| Metric | Value (maintenance close) |
| --- | --- |
| Hub directed pairs | **601** |
| Oracle product | **601** (72 core + 529 extended) |
| Below target | **0** |

## Refused

- 601-pair production parity marketing
- Browser/worker runtime claims without verify harness
- SQL/session production parity from runtime-cwl stubs alone
