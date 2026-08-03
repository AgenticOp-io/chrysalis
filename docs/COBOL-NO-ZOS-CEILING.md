# COBOL — no-z/OS build ceiling

> **As of:** 2026-08-03 (**G10113**)  
> **Purpose:** Document what Chrysalis COBOL can ship **without** a live z/OS LPAR, and the hard wall that requires one (or CICS TX / Enterprise Server).

## Done without z/OS

| Track | Status |
| --- | --- |
| Structural inventory / WebIR deepen | Exhausted on CLBS mini (**G10085–G10112**) |
| GnuCOBOL behavioral subjects | **68/68** on `agenticop-master` (`cobc` 3.1.2) |
| CardDemo / bank **COMPUTE extracts** | **G10113** — `CBACT04RN`, `CARDTRANRN`, `BANKWDRWRN` |
| Licensed drops (gitignored) | DFHAID, DFHBMSCA, CMQ* when present on disk |
| Residual | Sole open P0 = `copy:EXTFMAP` |

## Wall — need live z/OS (or equivalent)

| Need | Why GnuCOBOL / structural is not enough |
| --- | --- |
| Close `copy:EXTFMAP` by **drop** | Application BMS DSECT or SDFHCOB member — assemble/hunt on licensed stack |
| Honest **ABSENT** attestation | Operator must complete ZD&T/SDFHCOB hunt first (`cobol:extfmap-absent`) |
| CardDemo **CICS online** prove | Needs CICS TS or **CICS TX** + IBM COBOL for Linux |
| Real **VSAM / Db2 / IMS / JES** | Not inventable (**D6447**) |
| Enterprise COBOL / EBCDIC parity | GnuCOBOL ≠ origin dialect |

## Operator next steps

1. IBM Z Trial / ZD&T ADCD — run [`COBOL-ZD&T-LICENSED-EXTRACT-RUNBOOK.md`](./COBOL-ZD&T-LICENSED-EXTRACT-RUNBOOK.md) for EXTFMAP/DFHATTR.  
2. Or trial **CICS TX + COBOL for Linux on x86** for a subset of `CO*` compile (still no invent of missing books).  
3. Until then: claim **structural + GnuCOBOL-honest behavioral** only — **no LCB / no CardDemo-online equivalence**.

## Gates

- `pnpm run hub:cobol-clbs-prove-smoke`  
- `pnpm run hub:cobol-best-fit-smoke` (gate `webir-emit-pattern-no-zos-card-bank`)  
- `pnpm run hub:cobol-residual-ledger`
