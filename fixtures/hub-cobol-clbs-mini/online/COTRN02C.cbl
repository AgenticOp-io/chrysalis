      ******************************************************************
      * CardDemo COTRN02C-shaped structural probe (program, not map).
      * Upstream: aws-carddemo app/cbl/COTRN02C.cbl — transaction add
      * (RECEIVE/SEND + READ ACCTDAT/CXACAIX + STARTBR/READPREV/ENDBR +
      * WRITE TRANSACT + XCTL). Catalog EXEC CICS ops; COPY COTRN02/
      * COCOM01Y/COTTL01Y/CSDAT01Y/CSMSG01Y/CVTRA05Y/CVACT01Y/CVACT03Y
      * resolve; DFHAID+DFHBMSCA stay BMS holes. file-io hole — no fake
      * CICS/VSAM runtime (D6442/D6447). Not behavioral.
      ******************************************************************
       IDENTIFICATION DIVISION.
       PROGRAM-ID. COTRN02C.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-RESP-CD            PIC S9(9) COMP VALUE 0.
       01  WS-ACCT-ID            PIC X(11) VALUE SPACES.
       01  WS-TRN-KEY            PIC X(16) VALUE SPACES.
       01  WS-MAP-AREA.
           COPY COTRN02.
       COPY COCOM01Y.
       COPY COTTL01Y.
       COPY CSDAT01Y.
       COPY CSMSG01Y.
       COPY CVTRA05Y.
       COPY CVACT01Y.
       COPY CVACT03Y.
       COPY DFHAID.
       COPY DFHBMSCA.
       LINKAGE SECTION.
       01  DFHCOMMAREA.
           05  CA-OPTION         PIC X(01).
       PROCEDURE DIVISION USING DFHCOMMAREA.
       MAIN-LOGIC SECTION.
           EXEC CICS RECEIVE MAP('COTRN2A')
                MAPSET('COTRN02')
                INTO(WS-MAP-AREA)
                RESP(WS-RESP-CD)
           END-EXEC
           PERFORM P100-TRN-ADD
           EXEC CICS SEND MAP('COTRN2A')
                MAPSET('COTRN02')
                FROM(WS-MAP-AREA)
                RESP(WS-RESP-CD)
           END-EXEC
           EXEC CICS RETURN END-EXEC
           GOBACK.
       P100-TRN-ADD.
           EXEC CICS READ
                DATASET('ACCTDAT')
                INTO(WS-MAP-AREA)
                RIDFLD(WS-ACCT-ID)
                RESP(WS-RESP-CD)
           END-EXEC
           EXEC CICS READ
                DATASET('CXACAIX')
                INTO(WS-MAP-AREA)
                RIDFLD(WS-ACCT-ID)
                RESP(WS-RESP-CD)
           END-EXEC
           EXEC CICS STARTBR
                DATASET('TRANSACT')
                RIDFLD(WS-TRN-KEY)
                RESP(WS-RESP-CD)
           END-EXEC
           EXEC CICS READPREV
                DATASET('TRANSACT')
                INTO(WS-MAP-AREA)
                RIDFLD(WS-TRN-KEY)
                RESP(WS-RESP-CD)
           END-EXEC
           EXEC CICS ENDBR
                DATASET('TRANSACT')
                RESP(WS-RESP-CD)
           END-EXEC
           EXEC CICS WRITE
                DATASET('TRANSACT')
                FROM(WS-MAP-AREA)
                RIDFLD(WS-TRN-KEY)
                RESP(WS-RESP-CD)
           END-EXEC.
       P800-RETURN.
           EXEC CICS XCTL PROGRAM('COMEN01C') END-EXEC.
