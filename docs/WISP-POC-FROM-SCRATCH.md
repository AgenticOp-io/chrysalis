# WISP Module_Manager POC — historical from-scratch entry (G9992)

> Historical POC record. The supported build is now
> [`WISP-CWL-CONSOLIDATED-PIPELINE.md`](./WISP-CWL-CONSOLIDATED-PIPELINE.md).
> The package aliases below delegate to `scripts/wisp-cwl-one-pass.mjs`.

## One-shot

```bash
pnpm run hub:wisp-poc-from-scratch
pnpm run wisp:convert-one-pass
pnpm run wisp:convert-one-pass:deploy
```

Alias: `pnpm run wisp:poc-from-scratch`. **Report:** `reports/wisp/wisp-cwl-one-pass.json`

## Pipeline

The current stages, gates, and generated artifacts are documented in the
consolidated pipeline. Firebase staging and old phase mutation are not part of
the GCE conversion path.

**Future / method record:** [`FUTURE-ORIGIN-CORPUS-CONVERT.md`](./FUTURE-ORIGIN-CORPUS-CONVERT.md) — ingest all files → SQLite code DB → convert one piece at a time.
## Fidelity

| Surface | Rule |
| --- | --- |
| Look | Lifted markup + `original-css/*` (Module_Manager look authority) |
| `/api/admin` | Logical Module_Manager path; CWL client remaps HSS to `/admin/`; Hosting rewrites `/api/**` → `apiProxy` when the function is healthy |
| CORS | `assets/wisp-cwl-cors.js` — preflight-safe URLs (no `/admin`→`/admin/` redirect on OPTIONS); skip dead CF 503 cross-origin |
| Never | Treat shipping `_app` SPA as a substitute for conversion |

## Auth / deploy

ADC via `scripts/wisp/wisp-firebase-auth-env.mjs`. See also `UNIVERSAL-TRANSLATOR-CANON.md`.
