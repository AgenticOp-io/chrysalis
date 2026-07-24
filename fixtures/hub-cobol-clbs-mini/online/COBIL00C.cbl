      ******************************************************************
      * CardDemo COBIL00C-shaped structural probe (program, not map).
      * Upstream: aws-carddemo app/cbl/COBIL00C.cbl — bill payment
      * (ASKTIME/FORMATTIME + RECEIVE/SEND + READ/REWRITE ACCTDAT +
      * STARTBR/READPREV/ENDBR + WRITE TRANSACT + XCTL). Catalog EXEC
      * CICS ops; COPY COBIL00/COCOM01Y/COTTL01Y/CSDAT01Y/CSMSG01Y/
      * CVACT01Y/CVACT03Y/CVTRA05Y resolve; DFHAID+DFHBMSCA stay BMS
      * holes. file-io hole — no fake CICS/VSAM/date runtime
      * (D6442/D6447). Not behavioral.
      ******************************************************************
       IDENTIFICATION DIVISION.
       PROGRAM-ID. COBIL00C.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-RESP-CD            PIC S9(9) COMP VALUE 0.
       01  WS-ABS-TIME           PIC S9(15) COMP-3 VALUE 0.
       01  WS-DATE-STR           PIC X(10) VALUE SPACES.
       01  WS-ACCT-ID            PIC X(11) VALUE SPACES.
       01  WS-TRN-KEY            PIC X(16) VALUE SPACES.
       01  WS-MAP-AREA.
           COPY COBIL00.
       COPY COCOM01Y.
       COPY COTTL01Y.
       COPY CSDAT01Y.
       COPY CSMSG01Y.
       COPY CVACT01Y.
       COPY CVACT03Y.
       COPY CVTRA05Y.
       COPY DFHAID.
       COPY DFHBMSCA.
       LINKAGE SECTION.
       01  DFHCOMMAREA.
           05  CA-OPTION         PIC X(01).
       PROCEDURE DIVISION USING DFHCOMMAREA.
       MAIN-LOGIC SECTION.
           EXEC CICS ASKTIME
                ABSTIME(WS-ABS-TIME)
           END-EXEC
           EXEC CICS FORMATTIME
                ABSTIME(WS-ABS-TIME)
                YYYYMMDD(WS-DATE-STR)
           END-EXEC
           EXEC CICS RECEIVE MAP('COBIL0A')
                MAPSET('COBIL00')
                INTO(WS-MAP-AREA)
                RESP(WS-RESP-CD)
           END-EXEC
           PERFORM P100-BILL-PAY
           EXEC CICS SEND MAP('COBIL0A')
                MAPSET('COBIL00')
                FROM(WS-MAP-AREA)
                RESP(WS-RESP-CD)
           END-EXEC
           EXEC CICS RETURN END-EXEC
           GOBACK.
       P100-BILL-PAY.
           EXEC CICS READ
                DATASET('ACCTDAT')
                INTO(WS-MAP-AREA)
                RIDFLD(WS-ACCT-ID)
                UPDATE
                RESP(WS-RESP-CD)
           END-EXEC
           EXEC CICS REWRITE
                DATASET('ACCTDAT')
                FROM(WS-MAP-AREA)
                RESP(WS-RESP-CD)
           END-EXEC
           EXEC CICS STARTBR
                DATASET('CXACAIX')
                RIDFLD(WS-ACCT-ID)
                RESP(WS-RESP-CD)
           END-EXEC
           EXEC CICS READPREV
                DATASET('CXACAIX')
                INTO(WS-MAP-AREA)
                RIDFLD(WS-ACCT-ID)
                RESP(WS-RESP-CD)
           END-EXEC
           EXEC CICS ENDBR
                DATASET('CXACAIX')
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
