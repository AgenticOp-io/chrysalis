# Copybook drop notes (tracked)

This directory holds **origin / fixture** `.cpy` files that are safe to ship with Chrysalis.

## IBM / MQ proprietary — never invent, never publish

| Member | Rule |
| --- | --- |
| `DFHAID.cpy` | Licensed SDFHCOB drop only (ZD&T / CICS trial). **Gitignored.** |
| `DFHBMSCA.cpy` | Same. **Gitignored.** |
| `EXTFMAP.cpy` | Same if dropped. **Gitignored.** |
| `DFHATTR.cpy` | Same if dropped. **Gitignored.** |
| `CMQ*.cpy` | IBM MQ entitlement only. **Gitignored.** |

Operator path: [`docs/COBOL-IBM-SDFHCOB-DROP.md`](../../../docs/COBOL-IBM-SDFHCOB-DROP.md).  
Law: **D6442** / **D6447** — do not fabricate stubs to close residual P0.

`expandCobolCopybooks` expands these names **only when a licensed file is already on disk**; otherwise they stay honest `COPY` holes.
