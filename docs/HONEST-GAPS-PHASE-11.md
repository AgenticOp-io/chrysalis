# Honest gaps — Phase 11 (implementation)

> **Status:** closed (2026-06-19)  
> **Queue:** **G6280–G6290**  
> **Authority:** STRATEGIC-PLAN §13 amendment 2026-06-19 — implement in-repo portions of previously scaffolded honest gaps.

Phase 11 promotes **G6262–G6270** scaffolding into **verify-gated** implementation. Operator-only steps (customer billing, live pilot measurement on proprietary trees) remain documented; this program ships **automation + evidence** in-tree.

## Phase A — WordPress customer sample oracle (G6280)

| ID | Gate | Smoke |
| --- | --- | --- |
| G6280 | `runWordPressCustomerSampleOracleGate` | `pnpm run hub:wordpress-customer-sample-oracle-smoke` |

Fixture: `fixtures/wordpress-customer-sample` — `bootstrap/wp-load.php` + REST route mimicking customer slice layout.

Plan: [`WORDPRESS-CUSTOMER-ORACLE.md`](./WORDPRESS-CUSTOMER-ORACLE.md).

## Phase B — Customer north-star metrics (G6281)

| ID | Gate | Smoke |
| --- | --- | --- |
| G6281 | `runCustomerNorthStarMetricsGate` | `pnpm run hub:customer-north-star-metrics-smoke` |

Runs `chrysalis status --json` on `fixtures/tiny-blog` and asserts north-star fields (holes, insights, migration coverage).

Plan: [`CUSTOMER-NORTH-STAR-METRICS.md`](./CUSTOMER-NORTH-STAR-METRICS.md).

## Phase C — Commercial launch verify (G6282)

| ID | Gate | Smoke |
| --- | --- | --- |
| G6282 | `runCommercialLaunchVerifyGate` | `pnpm run hub:commercial-launch-verify-smoke` |

License CLI Vitest + in-tree SKU tier fixture (`fixtures/commercial/sku-tiers.json`).

Plan: [`COMMERCIAL.md`](./COMMERCIAL.md).

## Phase D — IR helper lifting B6 (G6283)

| ID | Gate | Notes |
| --- | --- | --- |
| G6283 | `runIrHelperLiftingB6StrlenInlineGate` | B6 v0: `strlen()` formal assign inlining on `lift-helper-sql-param-inline` |

Plan: [`IR-HELPER-LIFTING.md`](./IR-HELPER-LIFTING.md) B6 section.

## Phase E — WPTP D2+ harness (G6284)

| ID | Gate | Smoke |
| --- | --- | --- |
| G6284 | `runWptpD7HarnessGate` | `pnpm run hub:wptp-d7-harness-smoke` |

Wraps `pnpm run wptp:d7-audit` (Chrysalis-local checks; sibling repos optional).

Plan: [`MASTER-PROGRAM.md`](./MASTER-PROGRAM.md), [`WPTP-D7-ONGOING.md`](./WPTP-D7-ONGOING.md).

## Phase F — Program close (G6290)

| ID | Gate | Smoke |
| --- | --- | --- |
| G6285 | `runHonestGapsPhase11DepthGate` | composes G6280–G6284 |
| G6290 | `runHonestGapsImplementationCloseGate` | `pnpm run hub:honest-gaps-implementation-close-smoke` |

Composes scaffolding complete (**G6270**) + depth gates + maintenance governance.

Hub-completion depth schema **11**.
