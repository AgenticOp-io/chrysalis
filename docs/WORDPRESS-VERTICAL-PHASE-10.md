# WordPress vertical — Phase 10 entry

> **Status:** active (2026-06-19)  
> **Queue:** **G6210–G6219**  
> **Authority:** `docs/PRODUCTION-PARITY-PHASE-10.md` Phase B

## Goal

Open the WordPress vertical as a **verify-gated** program after Laravel/plain PHP wedge depth (Phase 1 closed).

## Phase A — Entry (G6210)

| Workstream | First slice |
| --- | --- |
| Ingest | `wp_*` hooks, plugin load order, theme template holes — fixture-driven |
| Oracle | Hub probe in-process capture on public + admin routes |
| Verify | Replay on emitted hono (correctness 1 on probe corpus) |

## Phase B — Probe fixture (G6212)

| ID | Gate | Smoke |
| --- | --- | --- |
| G6212 | `runWordPressVerticalProbeIngestGate` | `pnpm run hub:wordpress-probe-ingest-smoke` |

Fixture: `fixtures/wordpress-probe` — public + admin routes; manifest **`wordpressEffectCallees`** lowers **`wp_*`** to **`effect.wp.call`** (**G6225**).

Core stub fixture: `fixtures/wordpress-core-stub` — `lib/wp-core-stubs.php` implements wp_* for oracle replay (**G6224**).

## Phase C — Oracle prep + depth (G6213–G6219)

| ID | Gate | Notes |
| --- | --- | --- |
| G6213 | `runWordPressVerticalObserveManifestGate` | `chrysalis.observe.json` redaction for WP auth |
| G6214 | `runWordPressVerticalAdminRouteIngestGate` | `is_admin`, `current_user_can`, `wp_create_nonce`, `wp_die` |
| G6215 | `runWordPressVerticalVerifyPrepareGate` | emit prepare |
| G6217 | `runWordPressVerticalOracleCaptureGate` | `chrysalis.probe.json` mirrors routes |
| G6218 | `runWordPressVerticalOracleLiveCaptureGate` | `chrysalis.oracle-corpus.json` + verify replay |
| G6219 | `runWordPressVerticalVerifyReplayGate` | hub probe corpus replay |
| G6224 | `runWordPressVerticalCoreStubOracleGate` | `fixtures/wordpress-core-stub` + verify replay |
| G6225 | `runWordPressVerticalWpEffectLoweringGate` | manifest `wordpressEffectCallees` |
| G6216 | `runWordPressVerticalPhase10DepthGate` | composes G6212–G6225 |

Artifacts:

- `fixtures/wordpress-probe/chrysalis.probe.json` — capture route manifest
- `fixtures/wordpress-probe/chrysalis.oracle-corpus.json` — live probe corpus metadata

## Phase D — Non-goals (still)

- Full plugin ecosystem parity without per-plugin evidence
- Marketing "any WordPress site" without oracle on customer slice

## Gates

| ID | Gate |
| --- | --- |
| G6211 | `runWordPressVerticalPhase10DocGate` |
| G6216 | `runWordPressVerticalPhase10DepthGate` |
| G6210 | `runWordPressVerticalPhase10EntryGate` |

```bash
pnpm run hub:strategic-plan-phase10-wordpress-entry-smoke
pnpm run hub:wordpress-probe-oracle-capture-smoke
pnpm run hub:strategic-plan-phase10-depth-smoke
```

## Registry

Path knowledge: `scripts/hub-ingest/hub-path-knowledge.mjs` (WordPress in typicalFrameworks).
