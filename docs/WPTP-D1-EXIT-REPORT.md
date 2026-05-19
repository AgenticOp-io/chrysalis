# WPTP D1 exit report — Chrysalis reference leg

**Program:** [Web Platform Translation Program](./MASTER-PROGRAM.md)  
**Deliverable:** D1 — Chrysalis (`theorem6/chrysalis`)  
**Date:** 2026-05-16  
**Technical source of truth:** `[ROADMAP.md](../ROADMAP.md)`

## Summary

Chrysalis meets the **chartered engineering** bar for D1: Milestones 0–6 (including 6A), Chrysalis 2.0 scale-out (**V2-M1–V2-M6**), and post-2.0 depth options **A–F** are implemented on `main`. **D1 is closed for program execution.** **D2+ proceeds** without waiting on sponsor funding (see MASTER-PROGRAM §10.1).

## Checklist (MASTER-PROGRAM §10 — technical gates)


| Gate                                          | Status  | Evidence                                                                                                                                 |
| --------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Tagged semver release                         | **Met** | [v2.0.1](https://github.com/theorem6/chrysalis/releases/tag/v2.0.1), [v2.0.0](https://github.com/theorem6/chrysalis/releases/tag/v2.0.0) |
| CI / tests documented and green on `main`     | **Met** | `.github/workflows/`, `pnpm test`, `docs/ADMINISTRATION.md`                                                                              |
| Operator docs reviewed (no matrix over-claim) | **Met** | `docs/DEPLOYMENT.md`, `docs/USER-GUIDE.md`, `docs/HOW-TO.md`, `docs/OPERATIONS.md`                                                       |


## Future (non-blocking)


| Item                       | Status     | Notes                                                                                         |
| -------------------------- | ---------- | --------------------------------------------------------------------------------------------- |
| Sponsor / funding sign-off | **Future** | §10.1 — paid programs and external funding messaging only; **does not block** D2+ engineering |


## Artifacts

- **WebIR export for D2:** `scripts/export-webir-bundle.mjs` → `chrysalis.webir.bundle@1.0.0`
- **IR hub (D2):** [theorem6/wptp-ir](https://github.com/theorem6/wptp-ir) (`@wptp/ir@v0.1.3`)
- **Compatibility matrix (D5):** [theorem6/wptp-matrix](https://github.com/theorem6/wptp-matrix) (`@wptp/matrix@v0.1.7`) — **18 edges**, compose + `verify:harness`, [GitHub Pages](https://theorem6.github.io/wptp-matrix/)
- **GCE smoke:** `scripts/gce-wptp-test-vm.ps1` + `gce-wptp-test-bootstrap.sh` (e2-small, `npm ci` from GitHub tags)
- **Program board:** [GitHub Project #1](https://github.com/users/theorem6/projects/1)

## WPTP sibling status (2026-05-19)

| Repo | Tag | Notes |
| --- | --- | --- |
| wptp-ir | v0.1.3 | IR v0 + WebIR import/export |
| wptp-adapter-openapi / browser | v0.1.1 | OpenAPI + HAR → IR |
| wptp-emit-nextjs / hono / fastify | v0.1.1 / v0.1.1 / v0.1.0 | Bronze emit; matrix harness + contract-replay **gold** |
| wptp-matrix | v0.1.7 | `npm ci` from `github:theorem6/*` tags; CI + Pages green |

## Recommended next steps (engineering)

1. **D5 matrix product** — Mark **exit met** on the program board (≥6 edges + composer + harness proof; site live). Update [`MASTER-PROGRAM.md`](./MASTER-PROGRAM.md) edge counts where still listed as **8**.
2. **`php-webir-hono` gold smoke** — Wire optional Chrysalis path in CI or document `CHRYSALIS_ROOT` + tiny-blog **100%** correctness bar (`wptp-matrix` `verify-gold-chrysalis.ts`).
3. **Silver depth** — OpenAPI/HAR → IR → WebIR export → Chrysalis `emit-hono` for routes that need lowering beyond bronze stubs (DESIGN D299–D300 follow-on).
4. **Ops** — Add a **HOW-TO** scenario for `gce-wptp-test-vm.ps1` (parity with Chrysalis GCE smoke). Re-run GCE after bootstrap changes uses cached `node_modules` unless `WPTP_MATRIX_FORCE_CI=1`.
5. **CI hygiene** — `wptp-matrix` / Chrysalis workflows: migrate Actions off Node 20 deprecation warning when convenient.
6. **Funding (non-blocking)** — §10.1 sponsor sign-off when ready; does not gate merges.

## Recommendation

Record **D1 complete** on the program board and continue **D2** / **D3** / **D5** on technical milestones. Revisit §10.1 funding when a sponsor is ready; do not pause repository work for it.