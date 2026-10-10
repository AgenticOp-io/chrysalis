# Convert execution ceilings — named residuals

**Status:** **named-residual ledger** (2026-10-10) — not closed by invent  
**CWL tip floor:** **1.0.88** (invent queue CLOSED)  
**Authority:** **D6442** / **D6447** · [`CONVERT-CWL-CONSUME.md`](./CONVERT-CWL-CONSUME.md) · CWL [`DNA-BUILD-NEXT.md`](../../chrysalis-cwl/docs/history/DNA-BUILD-NEXT.md)  
**Catalog:** [`fixtures/ci/convert-exec-ceilings.json`](../fixtures/ci/convert-exec-ceilings.json)  
**Gate:** `pnpm run hub:convert-exec-ceiling-smoke` → `CONVERT_EXEC_CEILINGS_HONEST`

## Why this exists

After tip **1.0.88**, language invent is closed. These three Convert-owned ceilings stay open as **honest residuals** until oracle + verify gold can fill them. Closing by forging evaluate / N-iter HTML / island JS is forbidden.

| Ceiling | Residual id | Honest today | Forbidden |
| --- | --- | --- | --- |
| Opaque `g_*` / DB evaluate | `cwl:opaque-cond-residual` | Named opaque conds; skip in `cwl-control-lower`; StubDb ≠ origin DB | Invent CWL/verify cond or DB evaluate |
| Foreach N-iteration HTML | `cwl:foreach-bind-doc-only` | Collection bind + one chrome sample; simulate empty-iter skip | Unroll N rows into HTML / invent nested foreach fixture |
| Browser island event **execution** | `cwl:island-event-contract-only` | RFC-0019 contracts + declarative `dispatch` | Hydration / client JS execution without verify gold |

## Prove

```powershell
pnpm run hub:cwl-pin-smoke
# → CONVERT_TIP_1_0_88_OK

pnpm run hub:convert-exec-ceiling-smoke
# → CONVERT_EXEC_CEILINGS_HONEST
```

Companion peels (already shipped; not invent):

- `hub:cwl-early-exit-smoke` — guards + foreach documentation IR
- `hub:layout-page-island-peel-smoke` — page island contract consume
- `hub:cwl-runtime-scaffold-depth-smoke` — browser bind API (contract only)

## Requested honesty (fill path — not this slice)

| Need | Owner | Note |
| --- | --- | --- |
| Oracle-backed cond / DB evaluate for opaque residuals | Convert + oracle | Real DB / replay — not `DEFAULT_STUB_DB` façades |
| N-iteration foreach HTML under verify | Convert | Needs real corpus loop subject + oracle; nested foreach still skipped |
| Island event execution (RFC-0019 v2) | Convert (+ CWL gene only if new surface) | Verify gold for origin client behavior; keep contracts until then |

## Reply shape

```text
CONVERT_EXEC: named-residual
SHA: <convert commit>
BRANCH: candidate/convert-exec-ceilings-honesty
CWL_PIN: file:1.0.88
LANDED: fixtures/ci/convert-exec-ceilings.json + hub:convert-exec-ceiling-smoke
OPEN: oracle fill for g_*/DB · N-iter HTML · island execution
SMOKES: CONVERT_TIP_1_0_88_OK · CONVERT_EXEC_CEILINGS_HONEST
```
