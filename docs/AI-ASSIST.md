# AI Assist — Chrysalis works best with AI

> **Authority:** DESIGN **D6417** · Gate: `hub:migration-chat-smoke`  
> **Invariant:** *Models propose; WebIR + oracle + verify dispose.*  
> **Refused:** LiteRT.js / browser `.tflite` as convert substrate (wrong model class; not on the locked path).

**Traffic-decides bar:** *AI drafts; recorded traffic decides.* LLM/IS may **propose** holes and scaffolds only — **propose ≠ dispose**. Merge and operator apply require a verify dispose certificate plus explicit confirm (`hub:dispose-plane-smoke`, `hub:llm-convert-verify-apply-smoke`). Oracle replay on real product fixtures decides whether a conversion claim is honest before “converted” (`hub:traffic-decides-bar-smoke` → `TRAFFIC_DECIDES_CONVERT_OK`). See [`../chrysalis-cwl/docs/history/TRAFFIC-DECIDES-BAR.md`](../chrysalis-cwl/docs/history/TRAFFIC-DECIDES-BAR.md) and [`UNIVERSAL-TRANSLATOR-CANON.md`](./UNIVERSAL-TRANSLATOR-CANON.md).

## Positioning

Chrysalis is a **verified migration substrate** (WebIR, oracle, chimera, CWL).  
It **works best in conjunction with an AI assistant** — Cursor, Claude, or any MCP client — that proposes lifts, hole fills, and explanations while Chrysalis **gates and verifies**.

Human + AI is intentional:

| Role | Owns |
| --- | --- |
| **AI** | Propose holes, scaffolds, explanations, multi-file drafts |
| **Human** | New language POCs, confirm RED apply, product judgment |
| **Chrysalis** | Ingest → WebIR → emit → oracle replay → verify dispose |

## Install the AI addon (MCP)

**Buyer path (recommended):** [`CURSOR-PILOT-KIT.md`](./CURSOR-PILOT-KIT.md) — MCP + Cursor rule + `pnpm run pilot:laravel-min` on the laravel-min wedge.

1. Build packages: `pnpm -r build` (or at least `@chrysalis/web-llm` + `@chrysalis/cli`).
2. Copy [`fixtures/pilot-kit/cursor-mcp.json`](../fixtures/pilot-kit/cursor-mcp.json) (or legacy [`fixtures/web-llm/cursor-mcp.example.json`](../fixtures/web-llm/cursor-mcp.example.json)) into Cursor MCP settings; set `cwd` to the repo root.
3. Start server: `pnpm run web-llm:mcp-server`
4. Tools are governor-labeled GREEN / YELLOW / RED (`listGovernedAgentTools`). RED apply requires confirm + verify green.

## Migration Chat (CLI + hub)

Chat-shaped session over the **same** agent tools (not a second convert path):

```bash
# Interactive
pnpm run chrysalis:chat
# or
chrysalis chat

# Scripted (CI / smoke)
pnpm run chrysalis:chat -- --script fixtures/web-llm/migration-chat-smoke-turns.txt --json
```

Hub (when operator web is running):

- `GET /api/config` → `aiAssist.recommended: true`, `aiAssist.liteRtSupported: false`
- `GET /migration-chat` — browser chat shell
- `POST /api/hub/migration-chat/turn` — `{ "line": "tools" }` or `"call hub_convert_govern_action {…}"`

## Commercial note

Optional future SKU split (playbook only — see [`COMMERCIAL.md`](./COMMERCIAL.md)):

- **Core** — convert + verify  
- **AI Assist** — MCP + Migration Chat + trajectories  
- **Cursor Pilot Kit** — self-serve laravel-min wedge ([`CURSOR-PILOT-KIT.md`](./CURSOR-PILOT-KIT.md)); closes “Start a Pilot” without AgenticOp in the room  

License enforcement never unlocks a verify bypass.

**Trust:** make the public Apache engine claim true — [`PUBLIC-ENGINE-CLAIM.md`](./PUBLIC-ENGINE-CLAIM.md).
