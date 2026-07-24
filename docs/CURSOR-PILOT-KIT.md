# Chrysalis Cursor Pilot Kit

> **Status:** active productization (parallel path from 2026-07-23 portfolio brief)  
> **Authority:** DESIGN **D6417** (AI Assist) · propose ≠ dispose  
> **Wedge:** `flagship/laravel-min` verify gates already in CI  
> **Companion:** [`AI-ASSIST.md`](./AI-ASSIST.md) · [`COMMERCIAL.md`](./COMMERCIAL.md) · [`PUBLIC-ENGINE-CLAIM.md`](./PUBLIC-ENGINE-CLAIM.md)

## Why this exists

Buyers work in **Cursor / MCP agents**. Speedscale already owns “AI needs traffic replay via MCP.” Chrysalis already has **observe → verify → repair**. This kit packages that loop so a pilot can run **without AgenticOp in the room**.

**Invariant:** models propose; WebIR + oracle + verify dispose. No LiteRT.js convert path.

## What you get

| Piece | Path |
| --- | --- |
| MCP server | `pnpm run web-llm:mcp-server` / `fixtures/pilot-kit/cursor-mcp.json` |
| Cursor rule (router) | `fixtures/pilot-kit/chrysalis-pilot.mdc` |
| Agent brief | `fixtures/pilot-kit/AGENTS-PILOT.md` |
| One-shot laravel-min prove | `pnpm run pilot:laravel-min` |
| Checklist | `fixtures/pilot-kit/PILOT-CHECKLIST.md` |
| Smoke | `pnpm run hub:cursor-pilot-kit-smoke` |

## 15-minute buyer path

```bash
# 0. Clone Chrysalis (public Apache claim — see PUBLIC-ENGINE-CLAIM.md)
git clone <chrysalis-repo> && cd chrysalis
pnpm install && pnpm -r build

# 1. Prove the wedge (existing gates — no new convert path)
pnpm run pilot:laravel-min

# 2. Wire Cursor MCP
# Copy fixtures/pilot-kit/cursor-mcp.json → Cursor MCP settings
# Set cwd to this repo root; restart MCP

# 3. Copy rule (optional but recommended)
# fixtures/pilot-kit/chrysalis-pilot.mdc → .cursor/rules/chrysalis-pilot.mdc

# 4. In Cursor: ask the agent to list MCP tools, then propose a hole fill —
#    apply only after chrysalis_verify / verify:flagship is green
```

Expected pilot prove output: `reports/pilot-kit/laravel-min-pilot.json` with `ok: true`.

## MCP tools (governor)

Same surface as [`AI-ASSIST.md`](./AI-ASSIST.md): GREEN / YELLOW / RED via `listGovernedAgentTools`.  
**RED apply** requires explicit confirm + verify green. Agents must not force-settle holes.

## Commercial SKU (48h Laravel weekend)

| Day | Buyer action |
| --- | --- |
| 0 | `pilot:laravel-min` green on their machine |
| 1 | Point MCP at their PHP tree (or laravel-full scaffold) |
| 2 | Review verify report + hole ledger; ST sign-off or residual ledger |

Sold as **AgenticOp practice** on the **Chrysalis engine** — not a second product.

## Parallel paths (do not confuse)

| Path | Role |
| --- | --- |
| **This kit** | GTM · self-serve PHP wedge |
| [`COBOL-PRIMARY-UNIVERSAL-BUILD.md`](./COBOL-PRIMARY-UNIVERSAL-BUILD.md) | Depth · CLBS / multi-origin prove |
| [`EXTERNAL-PROVE-CORPORA.md`](./EXTERNAL-PROVE-CORPORA.md) | Public CLBS / LegacyCodeBench inventory + in-tree prove scoreboard |
| [`TRADE-SECRET-AND-OSS-BOUNDARY.md`](./TRADE-SECRET-AND-OSS-BOUNDARY.md) | What stays private when engine is Apache |

## Gates

| Gate | Command |
| --- | --- |
| Pilot kit packaging | `pnpm run hub:cursor-pilot-kit-smoke` |
| Laravel-min verify | `pnpm run verify:flagship` / `pnpm run pilot:laravel-min` — **GCE green** with PHP `mysqli` + `pdo_sqlite` (`php8.2-mysql`, `php8.2-sqlite3`). Without them oracle-php / PDO fatals stay honest red |
| Non-flagship ST (plain-php API) | `pnpm run hub:complete-conversion-prove:plain-php` — D6448-ST `cwl-api` profile; hole-free CWL + fixture verify gold (no invented UI) |
| Non-flagship ST (tiny-blog) | `pnpm run hub:complete-conversion-prove:tiny-blog` — second `cwl-api` ST; RFC-0021 cond exprs + `g_<callee>` / `g_member_<path>` opaque for calls/members; stmt `foreach` collection bind; verify gold |
| Non-PHP ST (express) | `pnpm run hub:complete-conversion-prove:express` — JS→CWL hole-free 20/20 |
| Non-PHP ST (typescript) | `pnpm run hub:complete-conversion-prove:typescript` — first TypeScript Express→CWL `cwl-api` ST (`hub-flagship-typescript` 20/20; real `.ts` origin) |
| Non-PHP ST (python) | `pnpm run hub:complete-conversion-prove:python` — first Python Flask→CWL `cwl-api` ST (`hub-flagship-python` 20/20) |
| Non-PHP ST (go) | `pnpm run hub:complete-conversion-prove:go` — first Go Gin→CWL `cwl-api` ST (`hub-flagship-go` 20/20) |
| Non-PHP ST (csharp) | `pnpm run hub:complete-conversion-prove:csharp` — first C# ASP.NET Minimal API→CWL `cwl-api` ST (`hub-flagship-csharp` 20/20) |
| UI ST (WISP management) | `pnpm run hub:complete-conversion-prove:wisp` — first filled `wisp-ui` D6448-ST; evidence-only hole zero + origin-compare (no deepen injectors) |
| Site-inventory adapters | `pnpm run chrysalis:site-inventory-adapters-smoke` |
| Express depth (non-COBOL scoreboard) | `pnpm run hub:express-depth-batch-smoke` (+ `hub:plain-php-depth-batch-smoke` / `hub:symfony-depth-batch-smoke`) — all three green on GCE 2026-07-24 |
| External prove corpora | `pnpm run hub:external-prove-corpus-smoke` |
| Migration chat | `pnpm run hub:migration-chat-smoke` |
| LLM MCP | `pnpm run hub:llm-convert-mcp-smoke` |
