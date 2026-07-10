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

## Trajectory fields (schema v2)

Optional on `chrysalis.web-llm.trajectory-record`:

| Field | Type | Purpose |
| --- | --- | --- |
| `isTier` | string | Selected IS tier id |
| `isRetrievalHit` | boolean | Exact corpus match |
| `skipLlm` | boolean | Harness may skip neural propose |
| `domainId` | string | Open Legacy domain |
| `isCacheOutcome` | `hit` \| `near-miss` \| `miss` | Live cache outcome (**D6372**) |
| `verifyCostMs` | number | Verify dispose wall-clock |
| `sourceDigest` | string | Capsule invalidation key |
| `nearMissDomainId` | string | Donor domain on near-miss |

## MCP tools

| Tool | Role |
| --- | --- |
| `web_llm_resolve_shorthand` | Domain → tier + capsule + skipLlm (+ optional near-miss) |
| `web_llm_preferred_shorthand_tier` | Tier ladder (+ optional `domainId` corpus lookup) |
| `web_llm_export_shorthand` | Build/update corpus (CPU) |
| `web_llm_is_live_analytics` | Summarize hit/near-miss/miss + verifyCostMs |
| `web_llm_demote_shorthand` | Remove capsules after verify-fail / digest mismatch |

## Corpus bundle

`reports/web-llm/shorthand/intelligence-shorthands.v1.json`:

| Field | Purpose |
| --- | --- |
| `shorthands` | Full multi-tier export |
| `promotedShorthands` | One entry per domain (highest tier wins) |
| `tierRouting` | skip-Llm rate across Open Legacy index |

Live evidence: `reports/web-llm/shorthand/is-live-analytics.v1.json` (**G9510**).

## Promotion

`promoteShorthandsByDomain()` keeps the **highest externalized tier** per `domainId` (T5 beats T4 beats T3). Export runs promotion automatically; no GPU required. `demoteShorthandInRepo()` removes a domain after verify-fail.

## Close gate

**G8600** — `pnpm run hub:is-runtime-close-smoke`

Checks: export ok, promotion, tier routing rate ≥ 50%, `tinyBlog` resolves with `skipLlm`, trajectory tier logging, MCP tool present.

**G9510** — `pnpm run hub:is-live-analytics-close-smoke`

Checks: hit / near-miss / miss outcomes, analytics rates + verify p50, demote, MCP tools.

**G9520–G9550** — CynoEngine-inspired substrate (**D6375**):

- `pnpm run hub:is-near-miss-salience-smoke`
- `pnpm run hub:is-utility-prior-smoke`
- `pnpm run hub:convert-governor-smoke`
- `pnpm run hub:convert-aim-persist-smoke`

Composed in **G8550** Migration OS close (schema v3).

## Non-goals

- Storing customer source in shorthand (VMF charter)
- Skipping verify when `skipLlm === true`
- Claiming production hit rate from fixture skip-LLM alone
- IS-T2 LoRA training (Horizon C — sponsor GPU)
- Merging CynoEngine or replacing oracle with salience scores

## References

- [`INTELLIGENCE-SHORTHAND.md`](./INTELLIGENCE-SHORTHAND.md) — research + tier ladder
- [`CYNO-CHRYSALIS-COLLAB.md`](./CYNO-CHRYSALIS-COLLAB.md) — CynoEngine collaboration (closed **D6375**)
- [`OPEN-WEB-LLM-PROGRAM.md`](./OPEN-WEB-LLM-PROGRAM.md) — agent framework
- `packages/web-llm/src/shorthand-retrieval.ts` — implementation
- `packages/web-llm/src/shorthand-analytics.ts` — live evidence
- `packages/web-llm/src/shorthand-salience.ts` — near-miss salience (G9520)
