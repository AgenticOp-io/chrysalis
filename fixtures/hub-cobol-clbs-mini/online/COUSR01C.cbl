      ******************************************************************
      * CardDemo COUSR01C-shaped structural probe (program, not map).
      * Upstream: aws-carddemo app/cbl/COUSR01C.cbl — user add
      * (RECEIVE/SEND/WRITE USRSEC/XCTL back to COADM01C). Catalog EXEC
      * CICS ops; COPY COUSR01/COCOM01Y/COTTL01Y/CSDAT01Y/CSMSG01Y/
      * CSUSR01Y resolve; DFHAID+DFHBMSCA stay BMS holes. file-io hole
      * — no fake CICS/VSAM/auth runtime (D6442/D6447). Not behavioral.
      ******************************************************************
       IDENTIFICATION DIVISION.
       PROGRAM-ID. COUSR01C.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-RESP-CD            PIC S9(9) COMP VALUE 0.
       01  WS-USER-ID            PIC X(08) VALUE SPACES.
       01  WS-MAP-AREA.
           COPY COUSR01.
       COPY COCOM01Y.
       COPY COTTL01Y.
       COPY CSDAT01Y.
       COPY CSMSG01Y.
       COPY CSUSR01Y.
       COPY DFHAID.
       COPY DFHBMSCA.
       LINKAGE SECTION.
       01  DFHCOMMAREA.
           05  CA-OPTION         PIC X(01).
       PROCEDURE DIVISION USING DFHCOMMAREA.
       MAIN-LOGIC SECTION.
           EXEC CICS HANDLE CONDITION
                ERROR(P900-ABEND)
                DUPREC(P200-DUPREC)
           END-EXEC
           EXEC CICS RECEIVE MAP('COUSR1A')
                MAPSET('COUSR01')
                INTO(WS-MAP-AREA)
                RESP(WS-RESP-CD)
           END-EXEC
           PERFORM P100-USER-ADD
           EXEC CICS SEND MAP('COUSR1A')
                MAPSET('COUSR01')
                FROM(WS-MAP-AREA)
                RESP(WS-RESP-CD)
           END-EXEC
           EXEC CICS RETURN END-EXEC
           GOBACK.
       P100-USER-ADD.
           EXEC CICS WRITE
                DATASET('USRSEC')
                FROM(WS-MAP-AREA)
                RIDFLD(WS-USER-ID)
                RESP(WS-RESP-CD)
           END-EXEC.
       P200-DUPREC.
           CONTINUE.
       P800-RETURN.
           EXEC CICS XCTL PROGRAM('COADM01C') END-EXEC.
       P900-ABEND.
           EXEC CICS ABEND ABCODE('CUS1') END-EXEC.
