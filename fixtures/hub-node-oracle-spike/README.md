# Node / Express oracle spike (G103)

Pilot fixture for the second oracle origin (STRATEGIC-PLAN Phase 4).

**Today:** `pnpm run hub:node-oracle-spike` (schema v2, G135) runs `packages/oracle-node/record-smoke.mjs`, a hole-free lift on `fixtures/hub-gold-js-literal`, **and** a hole-free lift + CWL projection-coverage check (`summarizeCwlProjection`) on the real 20-route `fixtures/hub-flagship-express` — proving the rich CWL projection is origin-agnostic (PHP and JavaScript).

**Shipped (G110):** `fixtures/hub-flagship-express` (20 routes) + `pnpm run hub:express-flagship` (lift + hono gold + trace + OpenAPI export).

**Live capture mode:** `hub-oracle-record` now accepts `--base-url` + `--routes` for Node/Express hosts:

```bash
node scripts/hub-ingest/hub-oracle-record.mjs \
  --origin javascript \
  --base-url http://127.0.0.1:3000 \
  --routes "GET /health,GET /meta,POST /echo" \
  --out traces/hub-node-live.ndjson
```
