# WPTP D3 exit report — second source profile (non-PHP)

**Program:** [Web Platform Translation Program](./MASTER-PROGRAM.md)  
**Deliverable:** D3 — OpenAPI + browser (HAR) sources → IR v0 → Chrysalis emit  
**Date:** 2026-05-19  
**Status:** **Technical exit met** (engineering)

## Exit criteria (MASTER-PROGRAM §6 D3)

| Criterion | Evidence |
| --- | --- |
| Additional source family → **IR v0** | [`wptp-adapter-openapi`](https://github.com/theorem6/wptp-adapter-openapi), [`wptp-adapter-browser`](https://github.com/theorem6/wptp-adapter-browser) |
| **Verify story** reusing Chrysalis emit | Matrix compose paths **`openapi-ir-hono-chrysalis`**, **`har-ir-hono-chrysalis`** (silver): IR → WebIR bundle → **`scripts/emit-webir-bundle-hono.mjs`** → **`@chrysalis/emit-hono`** |
| Harness proof | [`wptp-matrix`](https://github.com/theorem6/wptp-matrix) `npm run verify:harness`; Chrysalis CI **`.github/workflows/wptp-d3-harness.yml`** |
| Legal / capture | Contract inputs only (OpenAPI file, HAR); no scrape-by-URL in-tree |

## Chrysalis CI

| Workflow | What it proves |
| --- | --- |
| [`wptp-harness-smoke.yml`](../.github/workflows/wptp-harness-smoke.yml) | Gold **`php-webir-hono`** + full **`verify:harness`** with `CHRYSALIS_ROOT` |
| [`wptp-d3-harness.yml`](../.github/workflows/wptp-d3-harness.yml) | Silver **OpenAPI** and **HAR** compose paths with `--verify` |
| [`webir-bundle-to-wptp-ir.yml`](../.github/workflows/webir-bundle-to-wptp-ir.yml) | D2 gold import (tiny-blog WebIR → `@wptp/ir`) |

## Grades (honest)

| Path | Grade | Notes |
| --- | --- | --- |
| `openapi-ir-hono`, `har-ir-hono` | Bronze | `@wptp/emit-hono` stubs only |
| `openapi-ir-hono-chrysalis`, `har-ir-hono-chrysalis` | Silver | Chrysalis lowering; not oracle replay |
| `php-webir-hono` | Gold | PHP oracle + `chrysalis verify` |

## Next program phase

**D4** — second **emit** target family with graded matrix entry (Next.js path exists at bronze via `wptp-emit-nextjs`).
