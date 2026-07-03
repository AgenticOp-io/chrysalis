# Open web-LLM program (Phase 32)

> **Status:** **Horizon B closed** (**G8240**, 2026-07-03); **framework + POC closed** (**G8290** / **G8310** / **G8320**, 2026-07-03)  
> **Authority:** **DESIGN D6275**; requires **G8100** WISP CWL UI parity **closed** (subordinate)  
> **Hub:** [`MIGRATION-OS.md`](./MIGRATION-OS.md)

> **Charter:** [`fixtures/web-llm/chrysalis.web-llm-charter.v1.json`](../fixtures/web-llm/chrysalis.web-llm-charter.v1.json)

## Thesis

Chrysalis is building the **semantic + verify substrate** for website work. Phase **32** open-sources the **LLM framework layer** without GPU spend: trajectories, benchmark, agent tools, MCP server, and verify-gated policy. **Models propose; WebIR + oracle + verify dispose.**

This is **not** a foundation-model train run. We ship **evidence infrastructure** first; sponsor-funded fine-tunes come later.

## Horizons (no cash injection)

| Horizon | Deliverable | Gate |
| --- | --- | --- |
| **A** | Package `@chrysalis/web-llm`, charter, docs | **G8200** |
| **A** | Web Verify Benchmark (WVB) from fixtures | build script |
| **A** | Trajectory JSONL + verify policy | **G8290** |
| **A** | MCP tool server (`web-llm-mcp-server.mjs`) | **G8290** |
| **A** | Intelligence Shorthand export tool (`web_llm_export_shorthand`) | **G8560** |
| **B** | Agent trajectory logging from Hub / Cursor hooks | **G8240** |
| **B** | Public WVB leaderboard from CI artifacts | **G8240** |
| **B** | Training shard export + recipe doc | **G8240** |
| **C** | Sponsor-funded CWL-native fine-tune | out of scope until funded |

## Package

**`@chrysalis/web-llm`** — trajectory append/read, WVB builder, agent tool schemas, verify gate policy.

```bash
pnpm --filter @chrysalis/web-llm build
pnpm run web-llm:build-benchmark
pnpm run web-llm:build-leaderboard
pnpm run web-llm:export-dataset
pnpm run hub:open-web-llm-close-smoke
pnpm run hub:open-web-llm-poc-smoke
pnpm run hub:wisp-web-llm-poc-close-smoke
```

## MCP server

Stdio JSON-RPC server exposing Chrysalis CLI tools:

```bash
pnpm run web-llm:mcp-server
```

Wire in Cursor MCP settings pointing at this command (repo root as cwd).

## Trajectories

Append-only JSONL (`chrysalis.web-llm.trajectory-record`). **Assistant** steps require `gate.ok` or explicit `unverified`.

```bash
pnpm run web-llm:record-trajectory -- --file reports/web-llm/session.jsonl --session web-llm-001 --step 1 --role user --content "migrate tiny-blog"
```

## Gates

| ID | Gate | Smoke |
| --- | --- | --- |
| **G8200** | Program entry | `hub:open-web-llm-entry-smoke` |
| **G8240** | Horizon B (dataset + leaderboard + auto-log) | `hub:open-web-llm-horizon-b-smoke` |
| **G8290** | Framework close (A + B) | `hub:open-web-llm-close-smoke` |
| **G8300** | Agent POC (scripted scenarios + hub) | `hub:open-web-llm-poc-smoke` |
| **G8310** | WISP + web-LLM unified POC | `hub:wisp-web-llm-poc-close-smoke` |

## Funding path (optional, not blocking)

Services + hosted verify remain primary ([`COMMERCIAL.md`](./COMMERCIAL.md)). Open weights arrive only after WVB + trajectory corpus justify a sponsor train run.

**Index:** [`PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md)
