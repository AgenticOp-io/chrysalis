# wordpress-probe

Minimal **Phase 10 WordPress vertical** ingest slice (**G6212**). One public route calls common **`wp_*`** APIs; ingest records them as **`data.call`** (unsupported semantics — not lowered to effects yet).

- **Ingest tests:** `packages/ingest/tests/wordpress-probe.test.ts`
- **Gate:** `runWordPressVerticalProbeIngestGate` in `hub-cwl-fullstack-gates.mjs`
- **Smoke:** `pnpm run hub:wordpress-probe-ingest-smoke`

**Non-goal:** full plugin/theme oracle — that requires a dedicated WP fixture and capture path (future G6213).
