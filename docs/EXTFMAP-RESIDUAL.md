# EXTFMAP residual — honest close path (G10125 · G10127)

**Status:** sole COBOL P0 remains **OPEN**  
**Invariant:** Never invent `EXTFMAP.cpy` (**D6447**)  
**Dual-primary prove:** `pnpm run hub:cobol-extfmap-residual-smoke` → token **`EXTFMAP_RESIDUAL_HONEST_OK`** (**G10127**)

## Why not closed in the UT↔Helix spine ship

Closing `copy:EXTFMAP` requires **one** of:

1. **Licensed drop present** at `fixtures/hub-cobol-clbs-mini/copybook/EXTFMAP.cpy` (ZD&T / SDFHCOB hunt), **or**
2. **Operator ABSENT attestation** after that hunt proves the member is not in the licensed libraries:

```powershell
$env:CHRYSALIS_EXTFMAP_ABSENT = "1"
pnpm run cobol:extfmap-absent
```

Without (1) or (2), residual ledger correctly keeps P0 **open**. The UT spine does not depend on EXTFMAP.

## Operator checklist (ZD&T)

See [`COBOL-IBM-SDFHCOB-DROP.md`](./COBOL-IBM-SDFHCOB-DROP.md) · [`COBOL-ZD&T-LICENSED-EXTRACT-RUNBOOK.md`](./COBOL-ZD&T-LICENSED-EXTRACT-RUNBOOK.md) · [`COBOL-NO-ZOS-CEILING.md`](./COBOL-NO-ZOS-CEILING.md).

| Step | Done? |
|------|-------|
| Hunt SDFHCOB / ADCD for EXTFMAP | |
| If found: place licensed `.cpy` (gitignored) and re-run residual | |
| If not found: set `CHRYSALIS_EXTFMAP_ABSENT=1` and run `cobol:extfmap-absent` | |
| Confirm `reports/cobol/extfmap-absent.json` status ≠ `open` | |

## Status + residual honesty smokes

```powershell
pnpm run cobol:extfmap-status
pnpm run hub:cobol-residual-ledger
pnpm run hub:cobol-extfmap-residual-smoke
```

- `cobol:extfmap-status` — exits 0; prints `open|present|absent-attested` without inventing the COPY  
- `hub:cobol-extfmap-residual-smoke` (**G10127**) — asserts sole open P0 proprietary COPY is `copy:EXTFMAP`, status matches drop disk, refuses force-close  

Residual stays **open** until drop or ABSENT attestation.

## Relation to Pilot Kit

`pilot:cobol-clbs` may stay green with EXTFMAP as sole open P0.  
CWL ↔ Helix spine (`chrysalis-cwl` `npm run smoke:ut-spine`) does not require COBOL or Convert.
