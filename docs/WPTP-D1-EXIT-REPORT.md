# WPTP D1 exit report — Chrysalis reference leg

**Program:** [Web Platform Translation Program](./MASTER-PROGRAM.md)  
**Deliverable:** D1 — Chrysalis (`theorem6/chrysalis`)  
**Date:** 2026-05-16  
**Technical source of truth:** [`ROADMAP.md`](../ROADMAP.md)

## Summary

Chrysalis meets the **chartered engineering** bar for D1: Milestones 0–6 (including 6A), Chrysalis 2.0 scale-out (**V2-M1–V2-M6**), and post-2.0 depth options **A–F** are implemented on `main`. **D1 is closed for program execution.** **D2+ proceeds** without waiting on sponsor funding (see MASTER-PROGRAM §10.1).

## Checklist (MASTER-PROGRAM §10 — technical gates)


| Gate                                          | Status  | Evidence                                                                                                                                 |
| --------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Tagged semver release                         | **Met** | [v2.0.1](https://github.com/theorem6/chrysalis/releases/tag/v2.0.1), [v2.0.0](https://github.com/theorem6/chrysalis/releases/tag/v2.0.0) |
| CI / tests documented and green on `main`     | **Met** | `.github/workflows/`, `pnpm test`, `docs/ADMINISTRATION.md`                                                                              |
| Operator docs reviewed (no matrix over-claim) | **Met** | `docs/DEPLOYMENT.md`, `docs/USER-GUIDE.md`, `docs/HOW-TO.md`, `docs/OPERATIONS.md`                                                       |


## Future (non-blocking)

| Item                         | Status   | Notes                                                                 |
| ---------------------------- | -------- | --------------------------------------------------------------------- |
| Sponsor / funding sign-off   | **Future** | §10.1 — for paid programs and external funding messaging only; **does not block** D2+ engineering |

## Artifacts

- **WebIR export for D2:** `scripts/export-webir-bundle.mjs` → `chrysalis.webir.bundle@1.0.0`
- **IR hub (D2):** [theorem6/wptp-ir](https://github.com/theorem6/wptp-ir)
- **Program board:** [GitHub Project #1](https://github.com/users/theorem6/projects/1)

## Recommendation

Record **D1 complete** on the program board and continue **D2** / **D3** on technical milestones. Revisit §10.1 funding when a sponsor is ready; do not pause repository work for it.
