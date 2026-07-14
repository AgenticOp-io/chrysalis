# AI Assist — Chrysalis works best with AI

> **Authority:** DESIGN **D6417** · Gate: `hub:migration-chat-smoke`  
> **Invariant:** *Models propose; WebIR + oracle + verify dispose.*  
> **Refused:** LiteRT.js / browser `.tflite` as convert substrate (wrong model class; not on the locked path).

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

1. Build packages: `pnpm -r build` (or at least `@chrysalis/web-llm` + `@chrysalis/cli`).
2. Copy [`fixtures/web-llm/cursor-mcp.example.json`](../fixtures/web-llm/cursor-mcp.example.json) into Cursor MCP settings; set `cwd` to the repo root.
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

License enforcement never unlocks a verify bypass.
