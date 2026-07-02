# Web-LLM training recipe (no GPU)

> **Status:** scaffolding only — sponsor-funded fine-tune deferred  
> **Shard kind:** `chrysalis.web-llm.training-shard`  
> **Export:** `pnpm run web-llm:export-dataset`

## Objective

Train (later) a **CWL/WebIR-native** assistant that proposes website changes which **must pass Chrysalis verify**. Training data is **verify-gated trajectories**, not raw GitHub scrapes.

## Data pipeline (implemented)

```text
Smoke / agent run → trajectory JSONL (gate per step)
                 → export training-shards.v1.jsonl
                 → future fine-tune (sponsor GPU)
                 → evaluate on WVB + verify replay
```

## Trajectory logging

Enable auto-append on CI and local runs:

```bash
export CHRYSALIS_WEB_LLM_TRAJECTORY=1
pnpm run hub:open-web-llm-close-smoke
```

Output default: `reports/web-llm/gates/smokes.jsonl`  
Override: `CHRYSALIS_WEB_LLM_TRAJECTORY_PATH=/path/to/file.jsonl`

## Export command

After a site port or smoke run:

```bash
pnpm run web-llm:export-dataset
```

Site-port runs also export shards automatically to `reports/web-llm/dataset/site-port/` (see **`chrysalis port-site`** / **`hub:site-port-close-smoke`**, **D6280**).

Produces under `reports/web-llm/dataset/`:

| File | Purpose |
| --- | --- |
| `training-shards.v1.jsonl` | One shard per session (messages + gate) |
| `training-shards.v1.json` | Same, pretty-printed |
| `wvb-eval-prompts.v1.json` | Eval prompts from WVB cases |

**Intelligence Shorthand (IS-T3):** collapse verify-green shards to skill capsules — [`docs/INTELLIGENCE-SHORTHAND.md`](./INTELLIGENCE-SHORTHAND.md)

```bash
pnpm run web-llm:export-shorthand
# → reports/web-llm/shorthand/intelligence-shorthands.v1.json
```

## Shard schema

Each shard includes:

- `messages` — system/user/tool/assistant turns  
- `gate` — last verify gate result (must be `ok: true` for positive examples)  
- `tools` — tool names used in session  
- `provenance` — source labels  

**Rule:** Do not include assistant turns without `gate.ok` unless explicitly marked `unverified` in source trajectory.

## Eval

Primary metric: **WVB tier-weighted verify pass rate** — not BLEU.

```bash
pnpm run web-llm:build-benchmark
pnpm run web-llm:build-leaderboard
```

Leaderboard: `reports/web-llm/leaderboard/index.html`

## Fine-tune (deferred — IS-T2 LoRA)

When funded, use the **train manifest** (CPU export today; GPU train on optional lab VM):

```bash
pnpm run web-llm:export-lora-manifest
# or: pnpm run gpu-lab:prep
# → reports/web-llm/lora/train-manifest.v1.json

pnpm run hub:is-t2-lora-prep-smoke   # G8610 gate (no GPU)
```

Operator GPU path: [`GCE-GPU-LAB.md`](./GCE-GPU-LAB.md) — `gpu-lab:create` / `start` / `sync` / `train` / `stop`.

When funded on GPU:

1. Base model: manifest `baseModel` (default open Qwen 1.5B instruct class)  
2. Train on `training-shards.v1.jsonl` — target assistant messages after tool+verify turns  
3. Publish model card with WVB scores  
4. Ship MCP server + verify policy unchanged  

See [`OPEN-WEB-LLM-PROGRAM.md`](./OPEN-WEB-LLM-PROGRAM.md).
