# WPTP global scope

**Program:** [Web Platform Translation Program](./MASTER-PROGRAM.md)  
**Purpose:** Define what “global” means for WPTP — the **cross-platform** surface above Chrysalis (D1).

Chrysalis remains **PHP → WebIR → TypeScript (Hono/Fastify)** on `theorem6/chrysalis`. **Global scope** lives in **sibling repositories** and the **compatibility matrix** so the program can add sources and targets without expanding the Chrysalis product charter on `main`.

## Global scope includes

| Layer | Repository | Role |
| --- | --- | --- |
| **IR hub** | [theorem6/wptp-ir](https://github.com/theorem6/wptp-ir) | Neutral **IR v0**; import Chrysalis WebIR bundles; explicit losses |
| **Compatibility matrix** | [theorem6/wptp-matrix](https://github.com/theorem6/wptp-matrix) | Public **source × target × grade** claims with evidence hooks |
| **Source adapters** | [wptp-adapter-openapi](https://github.com/theorem6/wptp-adapter-openapi), [wptp-adapter-browser](https://github.com/theorem6/wptp-adapter-browser) | OpenAPI 3 and HAR traces → IR v0 |
| **Emit targets** | [wptp-emit-nextjs](https://github.com/theorem6/wptp-emit-nextjs) | Next.js App Router stubs from IR v0 (**bronze**) |
| **Verify harnesses** | Chrysalis today; `wptp-verify-*` when shared | Proof for **Gold** matrix edges |

## Platform families (working names)

| Family | Meaning | Adapter / engine today |
| --- | --- | --- |
| `php-legacy-web` | PHP app with HTTP + SQL + session | Chrysalis ingest + Oracle |
| `openapi-contract` | OpenAPI 3 document | `wptp-adapter-openapi` |
| `browser-trace` | HAR / browser capture | `wptp-adapter-browser` |
| `hono-typescript` | Hono on Node | Chrysalis `emit-hono` |
| `fastify-typescript` | Fastify on Node | Chrysalis `emit-fastify` |
| `chimera-dual-stack` | PHP + emitted TS routed together | Chrysalis `runtime-chimera` |
| `nextjs-route-handlers` | Next.js App Router handlers | `wptp-emit-nextjs` |

## Grades (normative)

See MASTER-PROGRAM §7. **Gold** requires automated replay or equivalent CI proof. **Bronze** = structural lift only. The matrix JSON must not mark **Gold** without `evidence` fields populated.

## Chrysalis ↔ global boundary

| In Chrysalis `main` | In WPTP global repos |
| --- | --- |
| WebIR, ingest, emit, verify, chimera | IR v0, matrix, non-PHP adapters |
| `scripts/export-webir-bundle.mjs` | `wptp-ir` import |
| Flagship corpora (tiny-blog, …) | Matrix **evidence** pointers |

Expanding **Chrysalis** to “all web platforms” on `main` still requires a **`DESIGN.md` Decision Log** entry. Expanding **WPTP** uses sibling repos and matrix rows.

## Execution

- **Funding:** future, non-blocking (MASTER-PROGRAM §10.1).
- **Tracking:** [GitHub Project #1](https://github.com/users/theorem6/projects/1), lanes D2–D7.
- **Composer paths:** [wptp-matrix `composer-paths.v0.json`](https://github.com/theorem6/wptp-matrix/blob/main/data/composer-paths.v0.json) (e.g. OpenAPI → IR → Next.js).
- **Matrix UI:** [wptp-matrix `site/index.html`](https://github.com/theorem6/wptp-matrix/blob/main/site/index.html) (local/static).
- **Next:** harden `wptp-ir` v0 tag, verify harness for composed paths, IR→WebIR bridge for Chrysalis emit reuse.
