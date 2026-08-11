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
| One-shot COBOL CLBS prove | `pnpm run pilot:cobol-clbs` (inventory + best-fit + residual; no runtime invent) |
| Checklist | `fixtures/pilot-kit/PILOT-CHECKLIST.md` |
| Smoke | `pnpm run hub:cursor-pilot-kit-smoke` → **`PILOT_KIT_OK`** |

**Not this kit:** CWL ↔ Helix cutover spine lives in **`chrysalis-cwl`** (`npm run smoke:ut-spine`) — Convert does not own DNA/surface cutover.  
**EXTFMAP:** sole COBOL open P0 — never invent; optional `pilot:cobol-clbs` may report residual.

## 15-minute buyer path

Runnable without invent. Packaging gate first (no PHP). Wedge prove needs PHP; stay honest-red if extensions missing.

### Preconditions

| Need | For |
| --- | --- |
| Node 20+ / pnpm | packaging + MCP |
| `pnpm install && pnpm -r build` | laravel-min prove (CLI dist) |
| PHP 8.1+ with `mysqli` + `pdo_sqlite` | laravel-min verify/oracle — **honest red** without them (no invented green) |

### Steps

```bash
# 0. At Chrysalis convert repo root (clone if needed — PUBLIC-ENGINE-CLAIM.md)
#    Fresh clone: pnpm install && pnpm -r build

# 1. Packaging gate (~1 min, no PHP) — expect token PILOT_KIT_OK
pnpm run hub:cursor-pilot-kit-smoke

# 2. Prove the laravel-min wedge (existing gates — no new convert path)
pnpm run pilot:laravel-min
# → reports/pilot-kit/laravel-min-pilot.json with ok: true
# Honest SKIP/red: missing PHP mysqli/pdo_sqlite → fix PHP, do not force-settle

# 3. Wire Cursor MCP
# Copy fixtures/pilot-kit/cursor-mcp.json → Cursor MCP settings
# Replace REPLACE_WITH_CHRYSALIS_REPO_ROOT with this repo root; restart MCP

# 4. Copy rule (optional but recommended)
# fixtures/pilot-kit/chrysalis-pilot.mdc → .cursor/rules/chrysalis-pilot.mdc

# 5. In Cursor: list MCP tools, then propose a hole fill —
#    apply only after chrysalis_verify / verify:flagship is green
```

| Gate | Token / artifact |
| --- | --- |
| Packaging | stdout **`PILOT_KIT_OK`** + `reports/pilot-kit/cursor-pilot-kit-smoke.json` |
| Wedge prove | `reports/pilot-kit/laravel-min-pilot.json` `ok: true` |
| Optional COBOL | `pnpm run pilot:cobol-clbs` — residual OK; **EXTFMAP** untouched |

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
| Pilot kit packaging | `pnpm run hub:cursor-pilot-kit-smoke` → **`PILOT_KIT_OK`** |
| Laravel-min verify | `pnpm run verify:flagship` / `pnpm run pilot:laravel-min` — **GCE green** with PHP `mysqli` + `pdo_sqlite` (`php8.2-mysql`, `php8.2-sqlite3`). Without them oracle-php / PDO fatals stay honest red |
| COBOL CLBS pilot | `pnpm run pilot:cobol-clbs` — best-fit + residual ledger; `.cbl` peels exhausted; **G10111** CSD/DCLGEN catalogs; **EXTFMAP** sole open P0 (never invent) |
| Public claim packaging | `pnpm run hub:public-engine-claim-smoke` — Apache LICENSE/README/trademark + Pilot Kit links (**G10108**) |
| OSS scrub (tracked tree) | `pnpm run hub:oss-scrub-smoke` — no SA/`.env`/private-key/engagements in `git ls-files` (**G10109**; history scrub still operator) |
| EXTFMAP ABSENT attest | `pnpm run cobol:extfmap-absent` with `CHRYSALIS_EXTFMAP_ABSENT=1` after ZD&T hunt — does **not** invent the book |
| Non-flagship ST (plain-php API) | `pnpm run hub:complete-conversion-prove:plain-php` — D6448-ST `cwl-api` profile; hole-free CWL + fixture verify gold (no invented UI) |
| Non-flagship ST (tiny-blog) | `pnpm run hub:complete-conversion-prove:tiny-blog` — second `cwl-api` ST; RFC-0021 cond exprs + `g_<callee>` / `g_member_<path>` opaque for calls/members; stmt `foreach` collection bind; verify gold |
| Non-PHP ST (express) | `pnpm run hub:complete-conversion-prove:express` — JS→CWL hole-free 20/20 |
| Non-PHP ST (typescript) | `pnpm run hub:complete-conversion-prove:typescript` — first TypeScript Express→CWL `cwl-api` ST (`hub-flagship-typescript` 20/20; real `.ts` origin) |
| Non-PHP ST (python) | `pnpm run hub:complete-conversion-prove:python` — first Python Flask→CWL `cwl-api` ST (`hub-flagship-python` 20/20) |
| Non-PHP ST (go) | `pnpm run hub:complete-conversion-prove:go` — first Go Gin→CWL `cwl-api` ST (`hub-flagship-go` 20/20) |
| Non-PHP ST (csharp) | `pnpm run hub:complete-conversion-prove:csharp` — first C# ASP.NET Minimal API→CWL `cwl-api` ST (`hub-flagship-csharp` 20/20) |
| Non-PHP ST (elixir) | `pnpm run hub:complete-conversion-prove:elixir` — first Elixir Plug.Router→CWL `cwl-api` ST (`hub-gold-elixir-plug` 20/20; Phoenix/LiveView honest holes) |
| Non-PHP ST (dart) | `pnpm run hub:complete-conversion-prove:dart` — first Dart Shelf→CWL `cwl-api` ST (`hub-gold-dart-shelf` 20/20; Flutter/Frog honest holes) |
| UI ST (WISP management) | `pnpm run hub:complete-conversion-prove:wisp` — first filled `wisp-ui` D6448-ST; evidence-only hole zero + origin-compare (no deepen injectors) |
| Site-inventory adapters | `pnpm run chrysalis:site-inventory-adapters-smoke` |
| Express depth (non-COBOL scoreboard) | `pnpm run hub:express-depth-batch-smoke` (+ `hub:plain-php-depth-batch-smoke` / `hub:symfony-depth-batch-smoke`) — all three green on GCE 2026-07-24 |
| External prove corpora | `pnpm run hub:external-prove-corpus-smoke` |
| Migration chat | `pnpm run hub:migration-chat-smoke` |
| LLM MCP | `pnpm run hub:llm-convert-mcp-smoke` |
