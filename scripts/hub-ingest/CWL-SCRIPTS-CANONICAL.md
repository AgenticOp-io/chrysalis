# CWL scripts — sync note

**Primary holder:** `../chrysalis-cwl/scripts/hub-ingest/` (and the rest of the CWL pillar).

**Always check `chrysalis-cwl` first.** Edit language tooling there, then sync. Never land divergent CWL script behavior only in convert.

## Procedure (from chrysalis-cwl)

```bash
npm run test:language
npm run setup:mirrors    # preferred: file symlinks for ALWAYS list
npm run sync:convert     # copies ALWAYS + Agent G helpers; no-op on reparse points
npm run test:cwl-mirrors
```

## Always sync (junction or byte-identical)

- `cwl-parser.mjs`
- `cwl-print.mjs`
- `cwl-ui-tree.mjs`
- `cwl-module-graph.mjs`
- `cwl-diagnose.mjs`
- `cwl-fullstack-holes.mjs`

## Sync as helpers (copy; not junctioned by setup:mirrors)

- `hub-t.mjs` — thin `HUB_T` (no fat `hub-lift-webir-route`)
- `hub-cwl-path-params.mjs`
- `hub-cwl-middleware.mjs`
- `hub-cwl-auth-presets.mjs`
- `hub-cwl-effects.mjs`

Keep `extractPathParamsFromCwlPath` identical to the pillar; convert may retain `cwlPathParamsForWebir`.

## Do not overwrite from pillar

| File | Reason |
| --- | --- |
| `cwl-fmt.mjs` | Convert keeps WebIR fmt; pillar fmt is parse→print — **locked dual-mode** |
| `cwl-ingest.mjs` | Convert keeps fat hub-lift ingest; pillar uses thin `hub-lift-cwl-webir` |

Decision doc: [`docs/CWL-FMT-DUAL-MODE.md`](../../docs/CWL-FMT-DUAL-MODE.md).  
See pillar constitution §7: `chrysalis-cwl/docs/language/CWL-PILLAR-HOME.md`.
