# CWL full-stack flagship pilot (G1157)

Authoring-first flagship: **pages**, **layout import**, and **API** routes in one CWL module with an explicit hole budget (**0 holes**).

```bash
pnpm run hub:cwl-fullstack-flagship-smoke
node scripts/hub-ingest/hub-gold-verify.mjs --suite cwl-fullstack-flagship-hono
```

Evidence gates: runtime-cwl preview probe, diagnose, structural gold (hono + fastify).
