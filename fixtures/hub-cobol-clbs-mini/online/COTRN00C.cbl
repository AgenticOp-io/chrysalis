      ******************************************************************
      * CardDemo COTRN00C-shaped structural probe (program, not map).
      * Upstream: aws-carddemo app/cbl/COTRN00C.cbl — transaction list
      * (RECEIVE/SEND + STARTBR/READNEXT/READPREV/ENDBR browse + XCTL
      * to COTRN01C/COMEN01C). Catalog EXEC CICS ops; COPY COTRN00/
      * COCOM01Y/COTTL01Y/CSDAT01Y/CSMSG01Y/CVTRA05Y resolve;
      * DFHAID+DFHBMSCA stay BMS holes. Browse is CICS-only (no COBOL
      * READ/WRITE verb) — exec-cics hole covers VSAM; no invented
      * file-io façade (D6442/D6447). Not behavioral.
      ******************************************************************
       IDENTIFICATION DIVISION.
       PROGRAM-ID. COTRN00C.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-RESP-CD            PIC S9(9) COMP VALUE 0.
       01  WS-TRN-KEY            PIC X(16) VALUE SPACES.
       01  WS-MAP-AREA.
           COPY COTRN00.
       COPY COCOM01Y.
       COPY COTTL01Y.
       COPY CSDAT01Y.
       COPY CSMSG01Y.
       COPY CVTRA05Y.
       COPY DFHAID.
       COPY DFHBMSCA.
       LINKAGE SECTION.
       01  DFHCOMMAREA.
           05  CA-OPTION         PIC X(01).
       PROCEDURE DIVISION USING DFHCOMMAREA.
       MAIN-LOGIC SECTION.
           EXEC CICS RECEIVE MAP('COTRN0A')
                MAPSET('COTRN00')
                INTO(WS-MAP-AREA)
                RESP(WS-RESP-CD)
           END-EXEC
           PERFORM P100-TRN-LIST
           EXEC CICS SEND MAP('COTRN0A')
                MAPSET('COTRN00')
                FROM(WS-MAP-AREA)
                RESP(WS-RESP-CD)
           END-EXEC
           EXEC CICS SEND TEXT
                FROM(WS-MAP-AREA)
                RESP(WS-RESP-CD)
           END-EXEC
           EXEC CICS RETURN END-EXEC
           GOBACK.
       P100-TRN-LIST.
           EXEC CICS STARTBR
                DATASET('TRANSACT')
                RIDFLD(WS-TRN-KEY)
                RESP(WS-RESP-CD)
           END-EXEC
           EXEC CICS READNEXT
                DATASET('TRANSACT')
                INTO(WS-MAP-AREA)
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
           EXEC CICS XCTL PROGRAM('COTRN01C') END-EXEC.
       P800-RETURN.
           EXEC CICS XCTL PROGRAM('COMEN01C') END-EXEC.
