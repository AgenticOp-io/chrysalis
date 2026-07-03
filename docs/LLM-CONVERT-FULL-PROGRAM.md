# LLM convert full program (Phase 43)

> **Status:** **active** (2026-07-03, **G8900**, **D6303** — user-amended)  
> **Authority:** **DESIGN D6303**; extends closed **Phase 42** (**G8830**, **D6302**)  
> **Requires:** **G8830** LLM-assisted convert closed; **G8550** maintenance green  
> **Subordinate to:** **G8550** / **G8570** / **G6731**

## Thesis

Expand LLM convert assist to **full operator workflow** while keeping the charter invariant:

*Models propose; WebIR + oracle + verify dispose.*

| Track | Scope | Gate |
| --- | --- | --- |
| **43a.1** | LLM/stub hole enrichment (`enrichConvertHoleProposals`) | **G8911** (`hub:llm-convert-enrich-smoke`) |
| **43a.2** | Verify-gated operator apply (`hub_convert_apply_holes`) | **G8912** (`hub:llm-convert-verify-apply-smoke`) |
| **43b** | MCP tools: enrich, verify gate, apply | **G8921** (composed in build slice) |
| **43c** | Program close + Phase 42 regression | **G8940** (`hub:llm-convert-full-build-slice-smoke`) |

## Allowed

- HTTP chat enrichment when `CHRYSALIS_CONVERT_LLM_API_KEY` or `CHRYSALIS_REPAIR_LLM_API_KEY` set
- Deterministic stub enrichment when no API key (CI-safe)
- Operator **confirmApply** after verify correctness ≥ 1
- Trajectory logging for enrich, verify gate, apply

## Refused (unchanged from D6302)

- Auto-apply without verify + operator confirm
- String transpile without WebIR
- Default convert path bypassing ingest/emit/oracle

## MCP tools (Phase 43)

| Tool | Purpose |
| --- | --- |
| `hub_convert_llm_enrich` | Enrich hole list with scaffold hints |
| `hub_convert_verify_gate` | Run/record verify-before-apply |
| `hub_convert_apply_holes` | Apply after verify + `confirmApply: true` |

## Regression

- **G8830** `hub:llm-assisted-convert-close-smoke` — composed in **G8940**
- **G8550** maintenance — run before Phase 43 slices
