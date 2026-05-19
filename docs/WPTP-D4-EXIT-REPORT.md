# WPTP D4 exit report — second emit target family (Next.js)

**Program:** [Web Platform Translation Program](./MASTER-PROGRAM.md)  
**Deliverable:** D4 — `@wptp/emit-nextjs` + verify harness + graded matrix edges  
**Date:** 2026-05-19  
**Status:** **Technical exit met** (engineering)

## Exit criteria (MASTER-PROGRAM §6 D4)

| Criterion | Evidence |
| --- | --- |
| **New emitter** | [`theorem6/wptp-emit-nextjs`](https://github.com/theorem6/wptp-emit-nextjs) (`@wptp/emit-nextjs@v0.1.1`) — `emitNextJsAppRouter` |
| **Verify harness** | [`wptp-matrix`](https://github.com/theorem6/wptp-matrix) `verifyComposedNextJsBronze`; paths **`openapi-ir-nextjs`**, **`har-ir-nextjs`** in `runMatrixHarness` |
| **Golden app (IR → target)** | Fixtures **`petstore-mini.openapi.json`**, **`mini.har.json`** → emitted `app/**/route.ts` stubs |
| **Graded matrix** | Bronze edges **`openapi-to-nextjs-composed`**, **`browser-to-nextjs-composed`**, **`wptp-ir-to-nextjs-handlers`** in [`matrix.v0.json`](https://github.com/theorem6/wptp-matrix/blob/main/data/matrix.v0.json) |

## Chrysalis CI

| Workflow | What it proves |
| --- | --- |
| [`wptp-d4-harness.yml`](../.github/workflows/wptp-d4-harness.yml) | Bronze compose + contract verify; **`@wptp/emit-nextjs`** `npm test` |
| [`wptp-harness-smoke.yml`](../.github/workflows/wptp-harness-smoke.yml) | Full matrix harness (includes Next.js bronze cases) |
| [`wptp-silver-nextjs-harness.yml`](../.github/workflows/wptp-silver-nextjs-harness.yml) | Silver OpenAPI/HAR → WebIR → `@wptp/emit-nextjs` |

## Grades (honest)

| Path | Grade | Notes |
| --- | --- | --- |
| `openapi-ir-nextjs`, `har-ir-nextjs` | **Bronze** | Structural App Router stubs; contract file checks |
| `php-webir-hono` | **Gold** | Chrysalis PHP oracle path (unchanged) |
| `openapi-ir-nextjs-chrysalis`, `har-ir-nextjs-chrysalis` | **Silver** | WebIR bundle bridge → `@wptp/emit-nextjs` (no `@chrysalis/emit-nextjs` on `main`) |
| Next.js + Chrysalis PHP oracle | — | **Not claimed** — gold remains `php-webir-hono` |

## Local check

```bash
# sibling wptp-matrix required
WPTP_MATRIX_ROOT=../wptp-matrix pnpm run wptp:d4-nextjs-harness
```

## Next program phase

**D5**, **D6** (policy pack), and **silver Next.js** (**DESIGN D306**) are **met**. Ongoing: **D7** matrix hygiene — [`WPTP-D7-ONGOING.md`](./WPTP-D7-ONGOING.md).
