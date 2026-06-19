# WordPress vertical — Phase 10 entry

> **Status:** active (2026-06-19)  
> **Queue:** **G6210–G6213**  
> **Authority:** `docs/PRODUCTION-PARITY-PHASE-10.md` Phase B

## Goal

Open the WordPress vertical as a **verify-gated** program after Laravel/plain PHP wedge depth (Phase 1 closed).

## Phase A — Entry (G6210)

| Workstream | First slice |
| --- | --- |
| Ingest | `wp_*` hooks, plugin load order, theme template holes — fixture-driven |
| Oracle | Capture admin + public routes on a minimal WP fixture (future) |
| Verify | Replay on emitted hono/fastify before cutover claims |

## Phase B — Probe fixture (G6212)

| ID | Gate | Smoke |
| --- | --- | --- |
| G6212 | `runWordPressVerticalProbeIngestGate` | `pnpm run hub:wordpress-probe-ingest-smoke` |

Fixture: `fixtures/wordpress-probe` — one route with **`add_action`**, **`apply_filters`**, **`get_bloginfo`**, **`wp_head`**, **`wp_footer`** recorded as **`data.call`**.

## Phase C — Non-goals (still)

- Full plugin ecosystem parity without per-plugin evidence
- Marketing "any WordPress site" without oracle on customer slice

## Gates

| ID | Gate |
| --- | --- |
| G6211 | `runWordPressVerticalPhase10DocGate` |
| G6212 | `runWordPressVerticalProbeIngestGate` |
| G6210 | `runWordPressVerticalPhase10EntryGate` |

```bash
pnpm run hub:strategic-plan-phase10-wordpress-entry-smoke
```

## Registry

Path knowledge: `scripts/hub-ingest/hub-path-knowledge.mjs` (WordPress in typicalFrameworks).
