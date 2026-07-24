# Curated GnuCOBOL probe samples (external prove)

When a public corpus tree fails `cobc -fsyntax-only` (wrong COPY cwd, IBM Enterprise dialect, CICS/VSAM, unimplemented JSON PARSE), the external prove smoke may fall back to these **curated** samples.

| Corpus | Sample | Notes |
| --- | --- | --- |
| `gnucobol-examples` | `banking.cbl` | Upstream `package/src/banking.cbl` (IBAN function) — preferred over `tests/*` that COPY with relative paths |
| `ibm-cobol-fun` | `IBMPROBE.cbl` | Curated GnuCOBOL-friendly mini; upstream FXSORT/JSON remain honest holes |
| `cobol-course` | `COURSEPROBE.cbl` | OT weekly gross `COMPUTE` (EMPPAY idiom); full OMP labs stay inventory-first when COPY/fixed-form fails |
| `dscobol-projects` | `DSCOBPROBE.cbl` | Simple `COMPUTE ROUNDED` product; herc03 MVS macros stay holes |
| `aws-carddemo` | `CARDPROBE.cbl`, `CARDTRAN.cbl` | Bill-fee + COTRN02-shaped tran-add fee; full CardDemo CICS/VSAM/COPY remain holes |
| `az-legacy-engineering` | `AZPROBE.cbl`, `AZBATCH.cbl` | `EVALUATE TRUE` / nested-IF control totals; BATCHVSAM/BATJSON remain holes |
| `rocket-bank` | `BANKPROBE.cbl`, `BANKWDRW.cbl` | Deposit interest + withdrawal remain; BBANK*/OPENFIL CICS remain holes |

**`cobcViaCurated`:** when the successful probe file lives under this tree, the scoreboard stamps `cobcViaCurated=true`. That is an honest curated path — **not** a claim that the full upstream clone compiles under GnuCOBOL.

Not LegacyCodeBench scores.
