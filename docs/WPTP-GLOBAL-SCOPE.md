# WPTP global scope

**Program:** [Web Platform Translation Program](./MASTER-PROGRAM.md)  
**Purpose:** Define what “global” means for WPTP — the **cross-platform** surface above Chrysalis (D1).

Chrysalis remains **PHP → WebIR → TypeScript (Hono/Fastify)** on `theorem6/chrysalis`. **Global scope** lives in **sibling repositories** and the **compatibility matrix** so the program can add sources and targets without expanding the Chrysalis product charter on `main`.

## Global scope includes

| Layer | Repository | Role |
| --- | --- | --- |
| **IR hub** | [theorem6/wptp-ir](https://github.com/theorem6/wptp-ir) (`@wptp/ir@v0.1.3`) | Neutral **IR v0**; import Chrysalis WebIR bundles; **export** back to `chrysalis.webir.bundle@1.0.0` (silver) |
| **Compatibility matrix** | [theorem6/wptp-matrix](https://github.com/theorem6/wptp-matrix) (`@wptp/matrix@v0.1.8`) | Public **source × target × grade** claims (**20** edges); **compose** + **verify harness** CLIs |
| **Source adapters** | [wptp-adapter-openapi](https://github.com/theorem6/wptp-adapter-openapi), [wptp-adapter-browser](https://github.com/theorem6/wptp-adapter-browser) | OpenAPI 3 and HAR traces → IR v0 |
| **Emit targets** | [wptp-emit-nextjs](https://github.com/theorem6/wptp-emit-nextjs), [wptp-emit-hono](https://github.com/theorem6/wptp-emit-hono), [wptp-emit-fastify](https://github.com/theorem6/wptp-emit-fastify) | Next.js / Hono / Fastify stubs from IR v0 (**bronze**); **contract-replay gold** in matrix harness |
| **Verify harnesses** | `wptp-matrix` (`wptp-verify-harness`, `npm run verify:harness`) | **Bronze** composed-path contracts; **Silver** WebIR import; **Gold** remains Chrysalis CI |

## Platform families (working names)

| Family | Meaning | Adapter / engine today |
| --- | --- | --- |
| `php-legacy-web` | PHP app with HTTP + SQL + session | Chrysalis ingest + Oracle |
| `openapi-contract` | OpenAPI 3 document | `wptp-adapter-openapi` |
| `browser-trace` | HAR / browser capture | `wptp-adapter-browser` |
| `hono-typescript` | Hono on Node | `@wptp/emit-hono` (bronze); Chrysalis `emit-hono` (gold, PHP-sourced) |
| `fastify-typescript` | Fastify on Node | `@wptp/emit-fastify` (bronze); Chrysalis `emit-fastify` (gold, PHP-sourced) |
| `chimera-dual-stack` | PHP + emitted TS routed together | Chrysalis `runtime-chimera` |
| `nextjs-route-handlers` | Next.js App Router handlers | `wptp-emit-nextjs` |

## Grades (normative)

See MASTER-PROGRAM §7. **Gold** requires automated replay or equivalent CI proof. **Bronze** = structural lift only. The matrix JSON must not mark **Gold** without `evidence` fields populated.

| Grade | Where it runs | Example |
| --- | --- | --- |
| **Bronze** | `wptp-matrix` | `openapi-ir-nextjs`, `har-ir-nextjs`, `openapi-ir-hono`, `har-ir-hono` compose + contract/runtime verify |
| **Silver** | `wptp-matrix` / `wptp-ir` | WebIR import; IR → WebIR export; **`openapi-ir-hono-chrysalis`** / **`har-ir-hono-chrysalis`** with `CHRYSALIS_ROOT` |
| **Gold** | Chrysalis `.github/workflows/` | `php-legacy-to-hono-ts`, `webir-bundle-to-wptp-ir` (tiny-blog) |

## Chrysalis ↔ global boundary

| In Chrysalis `main` | In WPTP global repos |
| --- | --- |
| WebIR, ingest, emit, verify, chimera | IR v0, matrix, non-PHP adapters |
| `scripts/export-webir-bundle.mjs` | `wptp-ir` import + `exportIrToWebIrBundleV0` |
| Flagship corpora (tiny-blog, …) | Matrix **evidence** pointers |

Expanding **Chrysalis** to “all web platforms” on `main` still requires a **`DESIGN.md` Decision Log** entry. Expanding **WPTP** uses sibling repos and matrix rows.

## Composer paths (live)

Documented in [composer-paths.v0.json](https://github.com/theorem6/wptp-matrix/blob/main/data/composer-paths.v0.json):

| Path ID | Steps | Grade |
| --- | --- | --- |
| `openapi-ir-nextjs` | OpenAPI → IR → Next.js | Bronze |
| `har-ir-nextjs` | HAR → IR → Next.js | Bronze |
| `openapi-ir-hono` | OpenAPI → IR → `@wptp/emit-hono` (runtime JSON stubs) | Bronze |
| `har-ir-hono` | HAR → IR → `@wptp/emit-hono` | Bronze |
| `openapi-ir-hono-chrysalis` | OpenAPI → IR → WebIR → Chrysalis `emit-hono` | Silver |
| `har-ir-hono-chrysalis` | HAR → IR → WebIR → Chrysalis `emit-hono` | Silver |
| `openapi-ir-nextjs-chrysalis` | OpenAPI → IR → WebIR → `@wptp/emit-nextjs` | Silver |
| `har-ir-nextjs-chrysalis` | HAR → IR → WebIR → `@wptp/emit-nextjs` | Silver |
| `php-webir-hono` | Chrysalis ingest + `@chrysalis/emit-hono` + verify | Gold |
| `webir-neutral-ir` | `export-webir-bundle` → `importWebIrBundleJson` | Gold (import); Silver (export bridge) |

**CLI (local or CI):**

```bash
# OpenAPI → app/ route stubs
npm run compose -- --path openapi-ir-nextjs --in fixtures/petstore-mini.openapi.json --out ./out --verify

# HAR → app/ route stubs
npm run compose -- --path har-ir-nextjs --in fixtures/mini.har.json --out ./out --verify

# OpenAPI → Hono bronze stubs (src/handlers + app.ts)
npm run compose -- --path openapi-ir-hono --in fixtures/petstore-mini.openapi.json --out ./out-hono --verify

# Bronze + silver harness (matrix repo)
npm run verify:harness
```

## Execution

- **Funding:** future, non-blocking (MASTER-PROGRAM §10.1).
- **Tracking:** [GitHub Project #1](https://github.com/users/theorem6/projects/1), lanes D2–D7.
- **Matrix UI:** [wptp-matrix on GitHub Pages](https://theorem6.github.io/wptp-matrix/) — **22 edges**, **12** composer paths, grade filters.
- **Chrysalis smoke (local / CI):** `CHRYSALIS_ROOT=<chrysalis checkout> npm run verify:harness` in `wptp-matrix` — silver compose + `php-webir-hono` gold (`wptp-harness-smoke.yml` on Chrysalis `main`); silver Next.js: **`wptp-silver-nextjs-harness`** workflow + **`pnpm run wptp:silver-nextjs-harness`**.
- **D6 policy:** [`WPTP-D6-ENTERPRISE-POLICY.md`](./WPTP-D6-ENTERPRISE-POLICY.md); ongoing: [`WPTP-D7-ONGOING.md`](./WPTP-D7-ONGOING.md).
- **GCE matrix smoke:** [HOW-TO §25](./HOW-TO.md#25-smoke-test-wptp-matrix-on-gce) — `scripts/gce-wptp-test-vm.ps1`.
- **D1 / D5 exit:** [`WPTP-D1-EXIT-REPORT.md`](./WPTP-D1-EXIT-REPORT.md).
- **Funding (non-blocking):** [`WPTP-FUNDING-TRACKER.md`](./WPTP-FUNDING-TRACKER.md).
