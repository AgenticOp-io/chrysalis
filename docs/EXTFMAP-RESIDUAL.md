# EXTFMAP residual — honest close path (G10125)

**Status:** sole COBOL P0 remains **OPEN**  
**Invariant:** Never invent `EXTFMAP.cpy` (**D6447**)

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

## Relation to Pilot Kit

`pilot:cobol-clbs` may stay green with EXTFMAP as sole open P0.  
CWL ↔ Helix spine (`chrysalis-cwl` `npm run smoke:ut-spine`) does not require COBOL or Convert.
