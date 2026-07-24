# Python flagship pilot (D6448-ST cwl-api)

Twenty-route **Flask** app mirroring `hub-flagship-express` (literal + JSON + path/query + status tuples). No invented product UI (**D6447**).

```bash
pnpm --filter @chrysalis/python-bridge build
pnpm --filter @chrysalis/ingest build
node scripts/hub-ingest/hub-python-flagship.mjs
pnpm run hub:complete-conversion-prove:python
```
