      ******************************************************************
      * CardDemo COSGN00C-shaped structural probe (program, not map).
      * Upstream: aws-carddemo app/cbl/COSGN00C.cbl — CICS sign-on
      * (RECEIVE/SEND/SEND TEXT/ASSIGN/READ USRSEC/XCTL to COMEN01C
      * or COADM01C). Catalog EXEC CICS ops; COPY COCOM01Y/COSGN00/
      * COTTL01Y/CSDAT01Y/CSMSG01Y/CSUSR01Y resolve; DFHAID+DFHBMSCA
      * stay BMS holes. file-io hole — no fake CICS/VSAM/auth runtime
      * (D6442/D6447). Not a behavioral subject.
      ******************************************************************
       IDENTIFICATION DIVISION.
       PROGRAM-ID. COSGN00C.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-RESP-CD            PIC S9(9) COMP VALUE 0.
       01  WS-USER-ID            PIC X(08) VALUE SPACES.
       01  WS-MAP-AREA.
           COPY COSGN00.
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
           EXEC CICS RECEIVE MAP('COSGN0A')
                MAPSET('COSGN00')
                INTO(WS-MAP-AREA)
                RESP(WS-RESP-CD)
           END-EXEC
           PERFORM P100-SIGNON
           EXEC CICS SEND MAP('COSGN0A')
                MAPSET('COSGN00')
                FROM(WS-MAP-AREA)
                RESP(WS-RESP-CD)
           END-EXEC
           EXEC CICS RETURN END-EXEC
           GOBACK.
       P100-SIGNON.
           EXEC CICS ASSIGN
                APPLID(WS-USER-ID)
           END-EXEC
           EXEC CICS READ
                DATASET('USRSEC')
                INTO(WS-MAP-AREA)
                RIDFLD(WS-USER-ID)
                RESP(WS-RESP-CD)
           END-EXEC
           EXEC CICS SEND TEXT
                FROM(WS-MAP-AREA)
                RESP(WS-RESP-CD)
           END-EXEC
           EXEC CICS XCTL PROGRAM('COMEN01C') END-EXEC.
