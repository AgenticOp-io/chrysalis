# Web-LLM POC (Phase 32c)

> **Status:** **closed** (**G8300** / **G8310** / **G8320**, 2026-07-03)  
> **Authority:** **DESIGN D6277**; composes with **G8100** (WISP UI parity) and **G8290** (framework close)  
> **Scenarios:** [`fixtures/web-llm/chrysalis.web-llm-poc-scenarios.v1.json`](../fixtures/web-llm/chrysalis.web-llm-poc-scenarios.v1.json)

## What this is

A **runnable, no-GPU proof-of-concept** for the open web-LLM program. Scripted agent scenarios exercise Chrysalis tools, run verify-gated checks, probe the live WISP GCE demo, append trajectories, and publish a static POC hub. **Models propose; WebIR + oracle + verify dispose.**

This is not training or hosted inference — it is the **demo loop** sponsors and operators can run locally or in CI.

## One-command demo

```bash
pnpm run web-llm:demo
```

Open `reports/web-llm/poc/index.html`. WISP live demo: [http://34.61.255.147:19100](http://34.61.255.147:19100) (`demo@wisptools.io`; password from env `CHRYSALIS_WISP_DEMO_PASSWORD` — do not commit passwords).

Strict live GCE anchor probes (operator / post-deploy):

```bash
CHRYSALIS_WISP_POC_LIVE=1 pnpm run hub:wisp-poc-live-smoke
```

## Scenarios

| ID | What it proves |
| --- | --- |
| `wvb-close-loop` | Build WVB, export training shards, publish leaderboard |
| `intelligence-shorthand-export` | Export IS-T3/T4/T5 shorthands + static hub (**G8560**, CPU only) |
| `wisp-ui-parity-anchors` | WISP anchor routes in WVB + parity manifest green |
| `wisp-gce-demo-contract` | Pure CWL deploy contract (no Svelte sidecar) |
| `wisp-gce-live-anchors` | HTTP probes against deployed GCE demo (soft-skip locally; strict with `CHRYSALIS_WISP_POC_LIVE=1`) |

Each scenario writes verify-gated records to `reports/web-llm/poc/sessions.jsonl`.

## Gates

| ID | Gate | Smoke |
| --- | --- | --- |
| **G8300** | Agent POC close | `hub:open-web-llm-poc-smoke` |
| **G8320** | WISP GCE live anchors (strict) | `hub:wisp-poc-live-smoke` |
| **G8310** | WISP + web-LLM unified POC (v2: + G8560 IS; optional G8320 live) | `hub:wisp-web-llm-poc-close-smoke` |

**G8310** runs **G8100** + **G8290** + **G8300** + **G8560** (`skipPort`). Set **`CHRYSALIS_G8310_LIVE=1`** to also run **G8320** live anchor probes.

## MCP integration

The same tool runner powers MCP and POC:

```bash
pnpm run web-llm:mcp-server
```

Wire in Cursor via [`fixtures/web-llm/cursor-mcp.example.json`](../fixtures/web-llm/cursor-mcp.example.json).

**Parent program:** [`OPEN-WEB-LLM-PROGRAM.md`](./OPEN-WEB-LLM-PROGRAM.md)
