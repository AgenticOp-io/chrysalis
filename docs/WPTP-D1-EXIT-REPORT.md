# WPTP D1 exit report — Chrysalis reference leg

**Program:** [Web Platform Translation Program](./MASTER-PROGRAM.md)  
**Deliverable:** D1 — Chrysalis (`theorem6/chrysalis`)  
**Date:** 2026-05-16 (updated 2026-05-19)  
**Technical source of truth:** `[ROADMAP.md](../ROADMAP.md)`

## Summary

Chrysalis meets the **chartered engineering** bar for D1: Milestones 0–6 (including 6A), Chrysalis 2.0 scale-out (**V2-M1–V2-M6**), and post-2.0 depth options **A–F** are implemented on `main`. **D1 is closed for program execution.** **D2+ proceeds** without waiting on sponsor funding (see MASTER-PROGRAM §10.1). **D5 matrix product exit** is also met (see below).

## Checklist (MASTER-PROGRAM §10 — technical gates)


| Gate                                          | Status  | Evidence                                                                                                                                 |
| --------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Tagged semver release                         | **Met** | [v2.0.1](https://github.com/theorem6/chrysalis/releases/tag/v2.0.1), [v2.0.0](https://github.com/theorem6/chrysalis/releases/tag/v2.0.0) |
| CI / tests documented and green on `main`     | **Met** | `.github/workflows/`, `pnpm test`, `docs/ADMINISTRATION.md`                                                                              |
| Operator docs reviewed (no matrix over-claim) | **Met** | `docs/DEPLOYMENT.md`, `docs/USER-GUIDE.md`, `docs/HOW-TO.md`, `docs/OPERATIONS.md`                                                       |


## Future (non-blocking)


| Item                       | Status     | Notes                                                                                         |
| -------------------------- | ---------- | --------------------------------------------------------------------------------------------- |
| Sponsor / funding sign-off | **Future** | §10.1 — tracked in [`WPTP-FUNDING-TRACKER.md`](./WPTP-FUNDING-TRACKER.md); does not block merges |


## Artifacts

- **WebIR export for D2:** `scripts/export-webir-bundle.mjs` → `chrysalis.webir.bundle@1.0.0`
- **IR hub (D2):** [AgenticOp-io/wptp-ir](https://github.com/AgenticOp-io/wptp-ir) (`@wptp/ir@v0.1.3`)
- **Compatibility matrix (D5):** [AgenticOp-io/wptp-matrix](https://github.com/AgenticOp-io/wptp-matrix) (`@wptp/matrix@v0.1.10`) — **24 edges**, compose + `verify:harness`, [GitHub Pages](https://theorem6.github.io/wptp-matrix/)
- **GCE smoke:** `scripts/gce-wptp-test-vm.ps1` + `gce-wptp-test-bootstrap.sh` (e2-small; [HOW-TO §25](./HOW-TO.md#25-smoke-test-wptp-matrix-on-gce)). Default **full harness**: builds **`~/chrysalis-test`**, **`wptp-emit-nextjs`**, runs **`verify-tiny-blog`**, then **`verify:harness`** with **`CHRYSALIS_ROOT`** / **`WPTP_EMIT_NEXTJS_ROOT`**. **`-MatrixOnlyHarness`** skips Chrysalis (matrix-only). Bootstrap reclones when **`MATRIX_REF`** or Chrysalis ref stamps change.
- **Chrysalis WPTP CI:** `.github/workflows/wptp-harness-smoke.yml` (`CHRYSALIS_ROOT` + matrix `verify:harness`)
- **Program board:** [GitHub Project #1](https://github.com/users/theorem6/projects/1)

## WPTP sibling status (2026-05-19)


| Repo                              | Tag                      | Notes                                                    |
| --------------------------------- | ------------------------ | -------------------------------------------------------- |
| wptp-ir                           | v0.1.3                   | IR v0 + WebIR import/export                              |
| wptp-adapter-openapi / browser    | v0.1.1                   | OpenAPI + HAR → IR                                       |
| wptp-emit-nextjs / hono / fastify | v0.1.1 / v0.1.1 / v0.1.0 | Bronze emit; matrix harness + contract-replay **gold**   |
| wptp-matrix                       | v0.1.10                  | `npm ci` from `github:theorem6/*` tags; CI + Pages green |


## Engineering priorities (2026-05-19) — delivered


| # | Priority | Status | Evidence |
| --- | --- | --- | --- |
| 1 | D5 matrix product | **Done** | 24 edges, 14 composer paths, Pages, [`MASTER-PROGRAM.md`](./MASTER-PROGRAM.md) D5 exit met |
| 2 | php-webir-hono gold smoke | **Done** | `wptp-harness-smoke.yml`; `CHRYSALIS_ROOT` + 100% tiny-blog bar documented in matrix README |
| 3 | Silver depth | **Done** | `openapi-ir-hono-chrysalis`, `har-ir-hono-chrysalis` harness + matrix edges |
| 4 | Ops / GCE HOW-TO | **Done** | [HOW-TO §25](./HOW-TO.md#25-smoke-test-wptp-matrix-on-gce) |
| 5 | CI hygiene | **Done** | Chrysalis + wptp-matrix workflows on Node **22** |
| 6 | Funding tracker | **Done** | [`WPTP-FUNDING-TRACKER.md`](./WPTP-FUNDING-TRACKER.md) |

## Recommendation

Record **D1** and **D5** complete on the program board. Continue **D2** / **D3** / **D7** expansion. Revisit §10.1 funding when a sponsor is ready.
