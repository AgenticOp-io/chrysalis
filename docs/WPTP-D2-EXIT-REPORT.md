# WPTP D2 exit report — IR hub specification v0

**Program:** [Web Platform Translation Program](./MASTER-PROGRAM.md)  
**Deliverable:** D2 — neutral IR hub (`theorem6/wptp-ir`)  
**Date:** 2026-05-19  
**Status:** **Technical exit met** (engineering); sponsor funding remains optional per [§10](./MASTER-PROGRAM.md#101-future--program-funding-non-blocking).

## Exit criteria (from MASTER-PROGRAM §6 D2)

| Criterion | Evidence |
| --- | --- |
| Public **IR schemaVersion 0** | `@wptp/ir` **v0.1.3** tagged; `schemaVersion: 0.1.0` on documents; [VERSIONING.md](https://github.com/theorem6/wptp-ir/blob/main/docs/VERSIONING.md) |
| **Loss report** from WebIR subset | `summarizeLosses` / `formatLossReportMarkdown`; `fixtures/reports/tiny-blog-loss.md` |
| **tiny-blog flagship zero losses** | `tests/tiny-blog-flagship.test.ts` — **325** nodes, **0** losses |
| **10+ golden fixtures** | **12** `fixtures/ir-v0/*.json` + matching WebIR bundles; **33** Vitest tests |
| **RFC-style versioning** | [wptp-ir/docs/VERSIONING.md](https://github.com/theorem6/wptp-ir/blob/main/docs/VERSIONING.md) |
| Chrysalis **export** path | `scripts/export-webir-bundle.mjs` → `chrysalis.webir.bundle@1.0.0` |
| **CI gold wire** | Chrysalis workflow [`.github/workflows/webir-bundle-to-wptp-ir.yml`](../.github/workflows/webir-bundle-to-wptp-ir.yml) |

## Chrysalis integration

- **Export:** `pnpm run export:webir-bundle` (see root `package.json`).
- **Verify import (local):** checkout `wptp-ir` beside Chrysalis, then  
  `WPTP_IR_ROOT=../wptp-ir WEBIR_BUNDLE_PATH=/tmp/tiny-blog.webir.bundle.json node --import tsx scripts/verify-webir-bundle-wptp-ir.mjs`  
  after exporting the tiny-blog golden.

## What D2 does *not* claim

- Neutral IR wired into Chrysalis **ingest/emit** on `main` (still WebIR-only product path).
- **Gold** matrix edges beyond documented harnesses ([`docs/WPTP-GLOBAL-SCOPE.md`](./WPTP-GLOBAL-SCOPE.md)).

## Next program phase

**D3** — second source profile (OpenAPI / browser adapters at bronze; full exit needs D2 sign-off on board + verify story per [MASTER-PROGRAM](./MASTER-PROGRAM.md)).
