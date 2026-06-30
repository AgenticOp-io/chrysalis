> **Archive notice:** Closed strategic-plan **phase** — source material for gates and fixtures. Active stack: [`MIGRATION-OS.md`](./MIGRATION-OS.md). Index: [`archive/INDEX.md`](./archive/INDEX.md).

# WordPress vertical — Phase 10

> **Status:** closed (2026-06-19)  
> **Queue:** **G6210–G6229**  
> **Authority:** `docs/PRODUCTION-PARITY-PHASE-10.md` Phase B (program closed at **G6257**)

## Goal

WordPress vertical **verify-gated** depth shipped on probe + core-stub fixtures. Real WordPress core install remains a **customer oracle** gap (`docs/PAUSED-AND-MAINTENANCE.md` §4).

## Phase A — Entry (G6210) — shipped

Gate: `runWordPressVerticalPhase10EntryGate` — doc + path knowledge + probe ingest.

| Workstream | First slice |
| --- | --- |
| Ingest | `wp_*` hooks via manifest `wordpressEffectCallees` → `effect.wp.call` |
| Oracle | Hub probe in-process capture on public + admin routes |
| Verify | Replay on emitted hono + fastify (correctness 1) |

## Phase B — Probe fixture (G6212) — shipped

| ID | Gate | Smoke |
| --- | --- | --- |
| G6212 | `runWordPressVerticalProbeIngestGate` | `pnpm run hub:wordpress-probe-ingest-smoke` |

Fixture: `fixtures/wordpress-probe` — public + admin routes; manifest **`wordpressEffectCallees`** lowers **`wp_*`** to **`effect.wp.call`** (**G6225**).

Core stub fixture: `fixtures/wordpress-core-stub` — `lib/wp-core-stubs.php` implements wp_* for oracle replay (**G6224**, **G6229** fastify).

## Phase C — Oracle prep + depth (G6213–G6229) — shipped

| ID | Gate | Notes |
| --- | --- | --- |
| G6213 | `runWordPressVerticalObserveManifestGate` | `chrysalis.observe.json` redaction for WP auth |
| G6214 | `runWordPressVerticalAdminRouteIngestGate` | `is_admin`, `current_user_can`, `wp_create_nonce`, `wp_die` |
| G6215 | `runWordPressVerticalVerifyPrepareGate` | emit prepare |
| G6217 | `runWordPressVerticalOracleCaptureGate` | `chrysalis.probe.json` mirrors routes |
| G6218 | `runWordPressVerticalOracleLiveCaptureGate` | `chrysalis.oracle-corpus.json` + verify replay |
| G6219 | `runWordPressVerticalVerifyReplayGate` | hub probe corpus replay |
| G6224 | `runWordPressVerticalCoreStubOracleGate` | `fixtures/wordpress-core-stub` hono verify replay |
| G6225 | `runWordPressVerticalWpEffectLoweringGate` | manifest `wordpressEffectCallees` |
| G6227 | `runWordPressVerticalWpCallVerifyReplayGate` | wp.call hono verify replay |
| G6228 | `runWordPressVerticalWpCallFastifyParityGate` | emit-fastify `wpCall` + probe fastify replay |
| G6229 | `runWordPressVerticalCoreStubFastifyVerifyReplayGate` | core-stub fastify verify replay |
| G6216 | `runWordPressVerticalPhase10DepthGate` | composes G6212–G6229 |

Artifacts:

- `fixtures/wordpress-probe/chrysalis.probe.json` — capture route manifest
- `fixtures/wordpress-probe/chrysalis.oracle-corpus.json` — live probe corpus metadata

## Phase D — Non-goals (still)

- Full plugin ecosystem parity without per-plugin evidence
- Real WordPress core tarball install in CI (customer oracle only)
