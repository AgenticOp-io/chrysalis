# Upstream CLBS snippets (not vendored as product code)

Fetched for inventory / idiom comparison only. License of upstream suite is unspecified — do not re-ship as Chrysalis IP.

| File | Role |
| --- | --- |
| `CKPRST.cbl` | Real batch checkpoint driver (VSAM + COPY) |
| `CKPRST.cpy` | Checkpoint control copybook |
| `HISTLD00.cbl` | Position history DB2 load (INDEXED + EXEC SQL INSERT/COMMIT) |
| `CBLDB21.cbl` | OMP Course #3 DB2 cursor sample (DECLARE/OPEN/FETCH/CLOSE) |
| `INQONLN.cbl` | Real online CICS inquiry |
| `POSUPDT.cbl` | Empty/stub upstream (0 bytes on clone) — architecture-shaped runnable: `../batch/POSUPDRN.cbl` |
| `RCVPRC00.cbl` | Process recovery handler (INDEXED + USING + EVALUATE TRUE) — runnable extract: `../batch/RCVPRCRN.cbl` |
| `RTNCDE00.cbl` | Return-code handler (USING + EVALUATE TRUE + EXEC SQL) — runnable extract: `../batch/RTNCDERN.cbl` |
| `UTLMNT00.cbl` | File maintenance utility (sequential control + VSAM + EVALUATE ARCHIVE/CLEANUP/REORG/ANALYZE) — runnable extracts: `../batch/UTLMNTRN.cbl` (USING control), `../batch/UTLMNTLS.cbl` (LINE SEQUENTIAL control façade) |
| `UTLVAL00.cbl` | Data validation utility (sequential control + INDEXED + EVALUATE INTEGRITY/XREF/FORMAT/BALANCE); CLBS has **no** `TRNVAL00` — runnable extract: `../batch/UTLVALRN.cbl` |
| `UTLMON00.cbl` | System monitoring utility (sequential config/log/alert + INDEXED DB2-STATS) — runnable extract: `../batch/UTLMONRN.cbl` |
| `TSTVAL00.cbl` | Test validation suite (sequential cases/expected/actual/report + EVALUATE TEST-TYPE) — runnable extract: `../batch/TSTVALRN.cbl` |
| `TSTGEN00.cbl` | Test data generator (sequential config + EVALUATE PORTFOLIO/TRANSACTN/ERROR/VOLUME) — runnable extract: `../batch/TSTGENRN.cbl` |
| `PORTVALD.cbl` | Portfolio validation subroutine (USING + EVALUATE TRUE ID/ACCT/TYPE/AMT) — runnable extract: `../batch/PORTVALRN.cbl` |
| `PORTVAL.cpy` | Portfolio validation constants/messages (upstream COPY for PORTVALD) — structural resolve: `../copybook/PORTVAL.cpy` + `../batch/PORTVALCP.cbl` |
| `PORTADD.cbl` | Portfolio add (INDEXED WRITE + EVALUATE TRUE status) — runnable extract: `../batch/PORTADDRN.cbl` |
| `PORTUPDT.cbl` | Portfolio update (INDEXED REWRITE + EVALUATE TRUE action) — runnable extract: `../batch/PORTUPDRN.cbl` |
| `PORTMSTR.cbl` | Portfolio master CRUD (USING + EVALUATE TRUE C/R/U/D + INDEXED) — runnable extract: `../batch/PORTMSTRN.cbl` |
| `PORTTEST.cbl` | Portfolio test-data generator (`COPY PORTFLIO`/`ERRHAND` + `FUNCTION RANDOM`) — structural only: `../batch/PORTTEST.cbl` (no RANDOM façade) |
| `COTRTLIC.cbl` / `COTRTUPC.cbl` | CardDemo Db2 tran-type list/update programs — structural online probes: `../online/COTRTLIC.cbl` / `../online/COTRTUPC.cbl` |
| `CSDB2RWY.cpy` / `CSDB2RPY.cpy` / `DCLTRTYP.dcl` / `DCLTRCAT.dcl` | CardDemo Db2 INCLUDE books — mini resolve under `../copybook/` (CSDB2RWY/CSDB2RPY/DCLTRTYP/DCLTRCAT `.cpy`) |
| `TRANEXTR.jcl` / `MNTTRDB2.jcl` / `CREADB21.jcl` | CardDemo Db2 unload/maintain/create JCL — inventory-only (IEBGENER / IKJEFT01 + DSNTIAUL/DSNTEP4/DSNTIAD utilities + **COBTUPDT**; no JES/DB2 runtime) |
| `COSGN00.bms` / `COMEN01.bms` / `COADM01.bms` / `COACTVW.bms` / `COBIL00.bms` / `CORPT00.bms` | CardDemo BMS mapsets (aws-carddemo `app/bms`) — inventory-only DFHMSD/DFHMDI/DFHMDF; **no BMS runtime**; DFHAID/DFHBMSCA stay holes until copybooks exist |
| `CBEXPORT.jcl` / `CBIMPORT.jcl` / `WAITSTEP.jcl` / `CREASTMT.JCL` / `POSTTRAN.jcl` / `INTCALC.jcl` | CardDemo batch JCL samples — inventory-only EXEC PGM= + DD; no JES invent |
| `DEPTPAY.CBL` | OMP Course #4 DEPTPAY (avg salary) |
| `EMPPAY.CBL` | OMP Course #4 EMPPAY (weekly/monthly pay) |
| `banking.cbl` | gnucobol-examples IBAN function (reference) |

Runnable Chrysalis adaptations (GnuCOBOL): `../batch/HISTLDRN.cbl` (HISTLD00 LINE SEQUENTIAL, no DB2), `../batch/IDXPROBE.cbl` (GnuCOBOL BDB INDEXED ≠ VSAM), `../batch/IDXGTNRN.cbl` (START KEY `>` + READ NEXT BDB), `../batch/IDXNLPRN.cbl` (START NOT LESS + READ PREV BDB), `../batch/IDXLTPRN.cbl` (START LESS + READ PREV BDB), `../batch/IDXEQNRN.cbl` (START EQUAL + READ NEXT BDB), `../batch/SQLINV00.cbl` (EXEC SQL hole catalog only), `../batch/POSUPDRN.cbl` (POSUPDT architecture-shaped; upstream empty), `../batch/RCVPRCRN.cbl`, `../batch/RTNCDERN.cbl`, `../batch/UTLMNTRN.cbl`, `../batch/UTLMNTLS.cbl`, `../batch/UTLVALRN.cbl`, `../batch/UTLMONRN.cbl`, `../batch/TSTVALRN.cbl`, `../batch/TSTGENRN.cbl`, `../batch/PORTVALRN.cbl`, `../batch/PORTADDRN.cbl`, `../batch/PORTUPDRN.cbl`, `../batch/PORTMSTRN.cbl`, `../batch/PORTCOMRN.cbl` (PORTCOM COPY-linked CRUD), `../batch/PORTVALCP.cbl`, `../batch/PORTTEST.cbl` (structural COPY + function-random hole), `../online/COTRTLIC.cbl` / `../online/COTRTUPC.cbl` (SQL/CICS structural + CSDB2/DCLTR INCLUDE), plus prior extracts (`CKPRSTRN`, `CLBSMATH`, `DEPTPAY`, `EMPPAYRN`, `SEQSUM`, CardDemo subjects, …).
