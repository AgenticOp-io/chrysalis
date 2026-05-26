# Translation Hub — path knowledge base

The **path knowledge base** is the comprehensive database of how every web language maps to every other through Chrysalis: **similarities**, **differences**, and **best practices** for all **575** directed origin×output pairs (23 origins × 26 outputs, minus identity).

## Export

```bash
pnpm run hub:path-knowledge
# → reports/ci/hub-path-knowledge.json

# Single pair
node scripts/hub-ingest/hub-path-knowledge-cli.mjs --origin python --output java
```

## API (operator hub)

| Endpoint | Description |
| --- | --- |
| `GET /api/hub/path-knowledge` | Full database (all pairs, languages, lane comparisons, best practices) |
| `GET /api/hub/path-knowledge?origin=php&output=hono` | One pair: path + similarities + differences + practices |
| `GET /api/hub/translation-path-matrix` | Raw path matrix (ingest/emit/verify lanes, steps) |

## Schema (`chrysalis.translation-hub.path-knowledge`)

| Section | Contents |
| --- | --- |
| `languages` | Per-id profile, ingest lane (origins), popularity |
| `laneComparisons` | How ingest/emit/verify lanes differ and what they share |
| `bestPractices` | Global rules (WebIR spine, holes, oracle, contract-first, …) |
| `originClusters` | Origins grouped by ingest lane |
| `pairs[]` | Per pair: `similarities`, `differences`, `bestPracticeIds`, `pathRef`, `promoteToGold` |
| `summary` | Grade and lane counts |

## Related docs

- [HUB-CROSS-LANGUAGE-SYNTHESIS.md](./HUB-CROSS-LANGUAGE-SYNTHESIS.md) — step-by-step consolidation of similarities, differences, and primitives across all languages
- [HUB-TRANSLATION-PATHS.md](./HUB-TRANSLATION-PATHS.md) — lane model and examples
- [HUB-CONNECTIVITY.md](./HUB-CONNECTIVITY.md) — SSH, capture, CI scripts

## Code

- `scripts/hub-ingest/hub-path-knowledge.mjs` — builder (source of truth)
- `scripts/hub-ingest/hub-translation-paths.mjs` — path matrix used by the builder
