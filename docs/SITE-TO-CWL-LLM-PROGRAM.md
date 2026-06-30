# Site → CWL → LLM program (Phase 33)

> **Status:** closed (**G8400** / **G8410**, 2026-06-16) — composed in **G8550** Migration OS  
> **Authority:** **DESIGN D6280**  
> **Hub:** [`MIGRATION-OS.md`](./MIGRATION-OS.md)  
> **CLI:** `chrysalis port-site <dir>`  
> **Smoke:** `pnpm run hub:site-port-close-smoke`

## Product definition

Chrysalis takes a **legacy web site**, ports it to **CWL** through WebIR + verify, and **builds an LLM program along the way**:

```text
Site → site intelligence → ingest → WebIR → emit CWL → verify (when corpus exists)
  → trajectory JSONL (auto) → WVB cases → export training shards → port report
```

**“Creating an LLM”** here means verify-gated **corpus + WVB + MCP tools + training shards** — not in-repo GPU fine-tuning (Horizon C deferred per **D6275**).

## Commands

### One-shot port (recommended)

```bash
chrysalis port-site fixtures/tiny-blog --origin php
```

Or via root script:

```bash
pnpm run site-port -- fixtures/tiny-blog --origin php
```

### Close gate (G8400)

```bash
pnpm run hub:site-port-close-smoke
```

Asserts on `fixtures/tiny-blog`:

- Site intelligence written to `.chrysalis/site-intelligence.json`
- WebIR ingest + CWL export (`migration.cwl`, ≥5 routes)
- Trajectory JSONL with gate records per pipeline step
- Training shard export under `reports/web-llm/dataset/site-port/`
- Port report `.chrysalis/site-port.json` (`chrysalis.site-port.v1`)

## Pipeline steps

| Step | Gate name | Artifact |
| --- | --- | --- |
| Site intelligence | `site-port:intelligence` | `.chrysalis/site-intelligence.json` |
| Ingest / WebIR | `site-port:ingest` | `.chrysalis/hub.<origin>.webir.json` |
| CWL export | `site-port:cwl-export` | `.chrysalis/migration.cwl` |
| Verify | `site-port:verify` | probe replay (correctness ≥ 1) or skip if `--no-verify` |
| Dataset export | `site-port:dataset-export` | `reports/web-llm/dataset/site-port/` |

Each step appends verify-gated records to the project trajectory (default: `reports/web-llm/site-port/<slug>.jsonl`).

Override trajectory path:

```bash
export CHRYSALIS_SITE_PORT_TRAJECTORY_PATH=/path/to/run.jsonl
chrysalis port-site ./my-app
```

## Training shards

After a port run, export or re-export shards:

```bash
pnpm run web-llm:export-dataset
```

See [`WEB-LLM-TRAINING-RECIPE.md`](./WEB-LLM-TRAINING-RECIPE.md) for the full no-GPU recipe.

## Non-goals (v1)

- Sponsor GPU fine-tune (Horizon C)
- WISP-specific demo surfaces (see **G8330** — separate showcase path)
- Hosted federation aggregator (Phase **34b** — see [`SITE-PORT-FEDERATION-PROGRAM.md`](./SITE-PORT-FEDERATION-PROGRAM.md))

## World expansion

See [`SITE-PORT-FEDERATION-PROGRAM.md`](./SITE-PORT-FEDERATION-PROGRAM.md) — **Verified Migration Federation (VMF)**, close gate **G8460**.

```bash
chrysalis port-site fixtures/tiny-blog
chrysalis federation submit-shard fixtures/tiny-blog --contributor my-handle
chrysalis federation merge-corpus
chrysalis federation publish-league
```

## Related docs

- [`OPEN-WEB-LLM-PROGRAM.md`](./OPEN-WEB-LLM-PROGRAM.md) — trajectories, WVB, MCP
- [`PROJECT-TO-CWL-TRANSLATE-PATH.md`](./PROJECT-TO-CWL-TRANSLATE-PATH.md) — CWL export mechanics
- [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md) §12 — default build queue
