# LLM-assisted convert program (Phase 42)

> **Status:** **active** (2026-07-03, **G8800**, **D6302** — user-amended)  
> **Authority:** **DESIGN D6302**; [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md) §12; [`INTELLIGENCE-SHORTHAND-PROTOCOL.md`](./INTELLIGENCE-SHORTHAND-PROTOCOL.md)  
> **Requires:** **G8790** full matrix oracle closed; **G8600** IS runtime; **G8290** open web-LLM closed  
> **Subordinate to:** **G8550** / **G8570** / **G6731** maintenance regression

## Thesis

Integrate LLM into the **conversion product** only as a **verify-gated propose layer** — never as a bypass around WebIR, ingest, emit, or oracle replay.

**Charter invariant:** *Models propose; WebIR + oracle + verify dispose.*

| Allowed | Refused |
| --- | --- |
| IS tier routing (`skipLlm`) before any full-weight call | String transpile without WebIR |
| LLM proposals for **holes**, **scaffold gaps**, operator UX | LLM repair that skips verify |
| Trajectory + MCP tools on `chrysalis ingest` / `verify` / hub translate | Promoting matrix tier without trace oracle |
| Horizon C fine-tune (sponsor GPU) after IS-T2 prep | Default convert path = LLM |

## Tracks

### Phase 42a — IS-routed convert assist (**G8810**)

| Slice | Scope | Gate |
| --- | --- | --- |
| **42a.1** | `resolveShorthandForTask` on hub translate / ingest jobs | **G8811** |
| **42a.2** | Hole proposals logged to trajectory; verify before apply | **G8812** |
| **42a.3** | Hub UI: show IS tier + skipLlm on job progress | **G8813** |

**Regression:** extend `hub:is-runtime-close-smoke`; compose in **G8830**.

### Phase 42b — Operator MCP convert workflow (**G8820**)

| Slice | Scope | Gate |
| --- | --- | --- |
| **42b.1** | MCP tools: `web_llm_resolve_shorthand`, propose hole patch (no auto-apply) | **G8821** |
| **42b.2** | Agent POC scenario: php→hono with verify loop | **G8822** |

**Regression:** `hub:open-web-llm-poc-smoke`, `hub:wisp-web-llm-poc-close-smoke`.

### Phase 42c — Program close (**G8830**)

Composite: **G8810** + **G8820** + **G8790** + **G8600** regression.

**Smoke (future):** `pnpm run hub:llm-assisted-convert-close-smoke` (**G8830**)

## Default queue interaction

Phase 42 runs **after** maintenance smokes green. It does **not** supersede **G8550** / **G6731**.

## Non-goals

- Replacing `@chrysalis/ingest` or emit backends with LLM output
- Customer headline: “AI converts any language”
- Training spend without sponsor (Horizon C remains gated)
