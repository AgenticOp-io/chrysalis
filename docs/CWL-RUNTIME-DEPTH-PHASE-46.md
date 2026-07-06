# CWL runtime depth — Phase 46 track 46b

> **Status:** **closed** (2026-07-06, **G9220** / **G9290**)  
> **Authority:** **DESIGN D6341**; [`PHASE-46-PROGRAM.md`](./PHASE-46-PROGRAM.md) track **46b**  
> **North star:** credible CWL **authoring + execution** surfaces — verify-gated; emit + oracle remain authoritative for production cutover.

## Goal

Deepen CWL runtimes beyond Node preview without violating **DESIGN §3**:

| Layer | Package | Status (Phase 46 entry) |
| --- | --- | --- |
| **Node simulator** | `@chrysalis/runtime-cwl` | Shipped — `simulateHandler`, session inject |
| **Node deploy emit** | `@chrysalis/emit-runtime-cwl` | Shipped — **G9200** + **G9240** deploy scaffold |
| **Browser scaffold** | `@chrysalis/runtime-cwl-browser` | Scaffold — island contract stub (**G9230**) |
| **Worker scaffold** | `@chrysalis/runtime-cwl-worker` | Scaffold — edge/worker contract stub (**G9235**) |

## Phase A — Emit + Node parity (shipped / reinforced)

| Gate | Scope |
| --- | --- |
| **G9200** | `hub:emit-runtime-cwl-smoke` |
| **G9240** | `hub:cwl-runtime-deploy-smoke` — Dockerfile + vendored runtime + npm install |
| **G1151** | `runCwlRuntimeParitySmoke` — gold fullstack/layout |
| **G6226** | `runRuntimeCwlSessionResolveProbeGate` — `resolveSession` + PHP `$_SESSION` probe |

## Phase B — Client island contract (in progress)

RFC-0019 v1 shipped **metadata-only** islands (`data-cwl-island="client"`). Phase 46b defines the **browser runtime contract** without claiming hydration execution in Node:

| Item | Status |
| --- | --- |
| Island metadata serialization | Shipped (RFC-0019) |
| Browser bundle loader contract | **Scaffold** — `@chrysalis/runtime-cwl-browser` |
| Hydration / client JS execution | **Refused** until RFC-0019 v2 + verify gold |
| Silent Svelte/React lowering | **Refused** |

## Phase C — Worker / edge scaffold (in progress)

| Item | Status |
| --- | --- |
| `@chrysalis/runtime-cwl-worker` package + kind constant | **Scaffold** |
| Emit to worker target | **Future** — requires emit package + verify harness |

## Phase D — Track close (G9220)

| Gate | Scope |
| --- | --- |
| **G9220** | emit-runtime-cwl + session resolve probe + browser/worker scaffold docs + parity smoke |

Skip emit HTTP in CI: `CHRYSALIS_STRATEGIC_PLAN_SKIP_EMIT_HTTP=1`.  
Skip deploy `npm install` in CI: `CHRYSALIS_STRATEGIC_PLAN_SKIP_CWL_DEPLOY_NPM=1`.

## Phase E — Deploy productization (G9240)

| Item | Status |
| --- | --- |
| Vendored `vendor/@chrysalis/*` runtime stack in emit output | **Shipped** |
| `Dockerfile` + `README.md` in emit output | **Shipped** |
| Operator doc | [`DEPLOYMENT.md`](./DEPLOYMENT.md#deploying-cwl-runtime-cwl-target) |
| Deploy smoke | `hub:cwl-runtime-deploy-smoke` |

## Non-goals

- Production Redis/DB session claims from runtime-cwl alone
- Marketing "full-stack runtime" without verify evidence
- Replacing chimera + hono/fastify cutover path

## Invariants (DESIGN §3)

- Handlers use injected `ctx.*`
- Unsupported IR → **501**, never invented bodies
- Session/SQL production claims require **oracle + verify replay**
