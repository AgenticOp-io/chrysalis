# Plain PHP flagship pilot (G116)

Twenty-route **procedural PHP** app (10 baseline + 10 CRUD/search slice) (`chrysalis.routes.json`, no Laravel/Symfony) for hub structural + trace gold.

```bash
pnpm run hub:plain-php-flagship
node scripts/hub-ingest/hub-gold-verify.mjs --suite plain-php-flagship-hono
```

Ingest uses **`@chrysalis/ingest`** via **`hub-php-hub-webir.mjs`** (not `lift-to-webir`). Pages use empty `text/plain` bodies or `json_encode` for `/meta` and `POST /echo` so the module stays hole-free.
