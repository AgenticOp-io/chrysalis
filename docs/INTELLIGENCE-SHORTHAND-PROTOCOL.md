# Intelligence Shorthand — runtime protocol (RFC-0001)

> **Status:** closed (**G8600** / **G8610**, 2026-07-03)  
> **Artifact kind:** `chrysalis.web-llm.intelligence-shorthand`  
> **Package:** `@chrysalis/web-llm` — `shorthand-retrieval.ts`  
> **Parent:** [`INTELLIGENCE-SHORTHAND.md`](./INTELLIGENCE-SHORTHAND.md)

## Problem

Exporting IS-T3/T4/T5 artifacts (**G8560**) stores domain intelligence cheaply, but agents still default to **prompt → weights → maybe verify**. The runtime protocol makes **tier selection and retrieval mandatory** before any general LLM call.

## Methodology

```text
1. Task arrives with domainId (Open Legacy index id)
2. resolveShorthandForTask() loads verify-gated corpus
3. If skipLlm === true → execute policy/oracle/capsule path (T3–T5)
4. Else if needsNovelLanguage → IS-T2+ (Horizon C, sponsor GPU)
5. Log isTier, isRetrievalHit, skipLlm on every trajectory step
6. verify still disposes — shorthand never bypasses gates
```

**Models propose; WebIR + oracle + verify dispose.** Shorthand is *what to retrieve*, not a substitute for verify.

## Tier selection

| Input | Rule |
| --- | --- |
| `hasOracleReplay && !needsNovelLanguage` | **IS-T5** |
| `hasPolicyGraph && !needsNovelLanguage` | **IS-T4** |
| verified capsule exists | **IS-T3** |
| `needsNovelLanguage` | **IS-T2+** |

Corpus-aware resolution (`resolveShorthandForTask`) binds the **best available artifact** for `domainId` and sets:

| Field | Meaning |
| --- | --- |
| `retrievalHit` | Shorthand artifact found for domain |
| `skipLlm` | Task can run without full-weight LLM (T3–T5) |

## Trajectory fields (schema v1)

Optional on `chrysalis.web-llm.trajectory-record`:

| Field | Type | Purpose |
| --- | --- | --- |
| `isTier` | string | Selected IS tier id |
| `isRetrievalHit` | boolean | Corpus match |
| `skipLlm` | boolean | Harness may skip neural propose |
| `domainId` | string | Open Legacy domain |

## MCP tools

| Tool | Role |
| --- | --- |
| `web_llm_resolve_shorthand` | Domain → tier + capsule + skipLlm |
| `web_llm_preferred_shorthand_tier` | Tier ladder (+ optional `domainId` corpus lookup) |
| `web_llm_export_shorthand` | Build/update corpus (CPU) |

## Corpus bundle

`reports/web-llm/shorthand/intelligence-shorthands.v1.json`:

| Field | Purpose |
| --- | --- |
| `shorthands` | Full multi-tier export |
| `promotedShorthands` | One entry per domain (highest tier wins) |
| `tierRouting` | skip-Llm rate across Open Legacy index |

## Promotion

`promoteShorthandsByDomain()` keeps the **highest externalized tier** per `domainId` (T5 beats T4 beats T3). Export runs promotion automatically; no GPU required.

## Close gate

**G8600** — `pnpm run hub:is-runtime-close-smoke`

Checks: export ok, promotion, tier routing rate ≥ 50%, `tinyBlog` resolves with `skipLlm`, trajectory tier logging, MCP tool present.

Composed in **G8550** Migration OS close (schema v3).

## Non-goals

- Storing customer source in shorthand (VMF charter)
- Skipping verify when `skipLlm === true`
- IS-T2 LoRA training (Horizon C — sponsor GPU)

## References

- [`INTELLIGENCE-SHORTHAND.md`](./INTELLIGENCE-SHORTHAND.md) — research + tier ladder
- [`OPEN-WEB-LLM-PROGRAM.md`](./OPEN-WEB-LLM-PROGRAM.md) — agent framework
- `packages/web-llm/src/shorthand-retrieval.ts` — implementation
