# Copybook drop notes (tracked)

This directory holds **origin / fixture** `.cpy` files that are safe to ship with Chrysalis.

## IBM / MQ proprietary — never invent, never publish

| Member | Rule |
| --- | --- |
| `DFHAID.cpy` | Licensed SDFHCOB drop only (ZD&T / CICS trial). **Gitignored.** |
| `DFHBMSCA.cpy` | Same. **Gitignored.** |
| `EXTFMAP.cpy` | Same **if** present on the licensed volume. **May be ABSENT from SDFHCOB** — do not invent. **Gitignored.** |
| `DFHATTR.cpy` | Same if dropped. **Gitignored.** |
| `CMQ*.cpy` | IBM MQ entitlement only (not SDFHCOB). **Gitignored.** |

Operator path: [`docs/COBOL-IBM-SDFHCOB-DROP.md`](../../../docs/COBOL-IBM-SDFHCOB-DROP.md).  
3-day extract runbook: [`docs/COBOL-ZD&T-LICENSED-EXTRACT-RUNBOOK.md`](../../../docs/COBOL-ZD&T-LICENSED-EXTRACT-RUNBOOK.md).  
Law: **D6442** / **D6447** — do not fabricate stubs to close residual P0.

`expandCobolCopybooks` expands these names **only when a licensed file is already on disk**; otherwise they stay honest `COPY` holes. Residual ledger marks `copy:NAME` **closed** when the drop is present.

### 3-day extract priority (ZD&T ADCD `B5C551`)

1. Confirm `DFHAID` / `DFHBMSCA` still closed (already dropped).  
2. Hunt `EXTFMAP` / `DFHATTR` in `DFH550.CICS.SDFHCOB` (ISPF **3.4** by volume) — **absent is OK**.  
3. MQ `CMQ*` only with separate entitlement.  
4. Never `git add` IBM/MQ `.cpy`.
