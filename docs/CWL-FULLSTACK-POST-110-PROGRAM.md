# Post–queue 110 program (locked default build)

> **Status:** active (2026-06-03)  
> **Prerequisite:** **G1159–G2258 complete** (CWL full-stack queues 6–110, hub-completion schema **183**)  
> **Authority:** `docs/STRATEGIC-PLAN.md` §12; hub verify-gaps months **26–30** (schema **74** baseline)

When the user says **build** without specifying after queue 110, prefer this program **in order**.

---

## Phase A — GCE validation gate (required before new product lanes)

| Step | Focus | Done when |
| --- | --- | --- |
| A1 | **Linux GCE green** | `pnpm run test:gce` → `STATUS: OK`; `reports/ci/gce-all-tests.ok` fetched |
| A2 | **Slim hub-cwl** | `gce-hub-cwl-vitest.sh` passes (RFC/parser smokes; batch smokes skipped) |
| A3 | **Authoring v61–110** | `gce-hub-authoring-batch-vitest.sh` passes on GCE (mega gates v106–v110 included) |
| A4 | **v110 graduation lock** | `gate110Mode: post90-hub-graduation-lock` ok in GCE phase log |

**Windows:** gate-only vitest locally; full proof on GCE (`docs/WINDOWS-COMPAT.md`).

---

## Phase B — Hub verify-gaps depth (months 26–30 reinforcement)

Reinforce locked hub verify-gaps program with **multi-flagship** and **env-gated CI** (no new schema fork unless hub-completion bumps):

| Step | ROADMAP band | Focus |
| --- | --- | --- |
| B1 | Month 26 | Auth-probe verify seed closure under `CHRYSALIS_HUB_GAP_REINGEST_STRICT` |
| B2 | Month 27 | Replay after reingest (`CHRYSALIS_HUB_GAP_REINGEST_VERIFY_REPLAY=1`) across flagships |
| B3 | Month 28 | HTTP oracle verify (`CHRYSALIS_HUB_GAP_REINGEST_VERIFY_HTTP=1`) hono + multi-flagship |
| B4 | Month 29 | Fastify HTTP + IR helper embed (`--ingest-embed-shared-helper-bodies`) batch |
| B5 | Month 30 | Graduation: dual-backend HTTP loop + IR helper B1–B4 full path |

---

## Phase C — Paused unless plan amended

| Lane | Policy |
| --- | --- |
| Laravel boring reliability | **Paused** (`ROADMAP.md` — WordPress/Laravel boring before plan amendment) |
| Matrix gold for marketing | **Paused** |
| Queue 111+ CWL authoring | **Requires** `DESIGN.md` Decision Log + `STRATEGIC-PLAN.md` amendment |

---

## Vitest layout (reference)

| File | Scope |
| --- | --- |
| `hub-cwl.test.ts` | RFC/parser/origin smokes; batch smokes **skipped on GCE** |
| `hub-cwl-authoring-batch-v61-v63.test.ts` | Gate-only v61–v63 |
| `hub-cwl-authoring-batch-v64-v70.test.ts` | Gate-only v64–v70 |
| `hub-cwl-authoring-batch-v71-v90.test.ts` | Gate-only v71–v90 |
| `hub-cwl-authoring-batch-v91-v110.test.ts` | v91–v105 local; v106–v110 GCE / `CHRYSALIS_RUN_HUB_HEAVY_AUTHORING_BATCH=1` |

---

*Related: `docs/GCE-LOCAL-VERIFY.md`, `docs/CWL-FULLSTACK-QUEUES-91-110.md`, `docs/WINDOWS-COMPAT.md`*
