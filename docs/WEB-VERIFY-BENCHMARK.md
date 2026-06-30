# Web Verify Benchmark (WVB)

> **Artifact kind:** `chrysalis.web-llm.web-verify-benchmark`  
> **Builder:** `pnpm run web-llm:build-benchmark`  
> **Output:** `fixtures/web-llm/chrysalis.web-verify-benchmark.v1.json`

## Purpose

WVB is the **open eval target** for website-management LLMs trained or fine-tuned on Chrysalis. Cases are derived from **in-repo fixtures** — no network fetch at build time.

## Case schema

Each case includes:

| Field | Meaning |
| --- | --- |
| `id` | Stable identifier |
| `fixture` | `fixtures/<name>/` directory |
| `path` | HTTP path |
| `method` | HTTP method |
| `task` | `verify` \| `migrate` \| `ui-parity` \| `ingest` |
| `tier` | `structural` \| `oracle` \| `showcase` |
| `tags` | Provenance labels |

## Sources

1. `fixtures/*/chrysalis.routes.json` route inventories  
2. WISP CWL static export manifest (`hub-wisp-management`)  
3. WISP UI parity anchor manifest  

## Scoring (future)

Models/agents are scored on **verify-gated** outcomes, not BLEU:

- Route correctness on chartered fixtures  
- Hole density vs budget  
- WVB tier-weighted pass rate  
- Trajectory steps until first green verify  

## Contribution

To add cases: add or extend a fixture with `chrysalis.routes.json` or a chartered manifest, rebuild WVB, run `hub:open-web-llm-close-smoke`.

See [`OPEN-WEB-LLM-PROGRAM.md`](./OPEN-WEB-LLM-PROGRAM.md).
