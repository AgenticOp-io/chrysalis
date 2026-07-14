# Universal Translator path (historical)

> **Superseded as canon by [`UNIVERSAL-TRANSLATOR-CANON.md`](./UNIVERSAL-TRANSLATOR-CANON.md)** (**D6438**).  
> Keep this file for diagnosis notes from **D6437**; do not use it as the build queue.

## Diagnosis (honest)

This project did **not** stay a PHP→TS converter. It correctly grew into:

1. **Engine** — oracle → WebIR → emit → verify → chimera  
2. **Hub** — multi-origin Migration OS + evidence  
3. **CWL** — hub language over WebIR  
4. **LLM / Intelligence Shorthand** — propose fills; verify disposes  
5. **Universal translator charter (G7690)** — N×N **through CWL** on **chartered** edges  

What went wrong operationally: a **POC showcase** (WISP Module_Manager) absorbed disproportionate build attention. Many programs are marked **closed** on **fixture/smoke bars**, while a real Universal Translator — AI-assisted, language-agnostic, verify-gated — still has **silver-dominant** multi-origin depth and incomplete customer cutover.

**WISP is not the product.** It remains optional evidence under `fixtures/` / operator demos.

## Goal

**AI-assisted universal web translator:** any supported web stack → WebIR/CWL → any supported outbound stack, with **oracle/verify as authority**, LLM/IS as **assist**, holes when honesty requires them.

```text
Lang A ──lift──▶ WebIR ──▶ CWL ◀──▶ emit ──▶ Lang B
         ▲                │
      oracle traces    LLM / IS propose
         │                │
         └──── verify dispose ────┘
```

## How we get there (ordered)

| Step | Work | Already have | Gap |
| --- | --- | --- | --- |
| 1 | **Protect dispose authority** | `@chrysalis/verify`, oracle-* | Keep refusing string-only transpile |
| 2 | **Deepen inbound lifts** | ingest UI lift, multi-origin adapters | Gold beyond fixtures |
| 3 | **Expand UT composer edges** | G7690 charter/smokes | New chartered A→CWL→B under hole budgets |
| 4 | **AI assist loop** | web-llm, Migration Chat, IS | Hit-rate on **live** hub jobs, not seed-only |
| 5 | **Generic convert libs** | `scripts/lib/*` (extracted from WISP harness) | Finish extracting remaining engine-generic scripts; delete WISP-named shims when unused |
| 6 | **POC quarantine** | `fixtures/hub-wisp-management` | No new `scripts/wisp-*` engine features |

## Extract map (first wave)

Canonical code: `scripts/lib/`. Temporary shims: `scripts/wisp-*`.

| Neutral | Role |
| --- | --- |
| `cwl-hole-metrics.mjs` | Markup hole census / bounds |
| `cwl-apply-surfaces.mjs` | CWL route/handler text surgery |
| `cwl-route-lift.mjs` | Route lift helpers |
| `cwl-bulk-svelte-lift.mjs` | Bulk Svelte→CWL lift |
| `cwl-api-oracle-contract.mjs` | API oracle / golden helpers |
| `cwl-static-export.mjs` | Static HTML export of `@page` routes |
| `cwl-chimera-gateway.mjs` | CWL + API chimera gateway |
| `cwl-gateway-config.mjs` | Pipeline config loader |
| `scrub-cwl-markup-artifacts.mjs` | Scrub leaked markup junk |

Regenerate knowledge DB after extract waves: `node scripts/build-initiative-knowledge.mjs`.

## Default build queue (reframed)

1. `hub:cwl-universal-translator-close-smoke` (G7690 regression)  
2. `hub:migration-os-close-smoke` (G8550)  
3. Origin/adapter gold deepening where UT edges fail  
4. Migration Chat / web-llm under verify  
5. **Not** new WISP Module_Manager chrome unless explicit POC ask  

## Non-goals

- Baking WISP product names into packages  
- Inventing GenieACS / maps / FCAPS (**D6205**)  
- Claiming 601-pair census = production idiomatic rewrite  
- LiteRT.js as convert runtime  
