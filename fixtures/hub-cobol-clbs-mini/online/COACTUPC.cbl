      ******************************************************************
      * CardDemo COACTUPC-shaped structural probe (program, not map).
      * Upstream: aws-carddemo app/cbl/COACTUPC.cbl — account update
      * with VSAM READ/REWRITE + CICS map I/O + procedure COPY holes.
      * Catalog EXEC CICS (HANDLE/RECEIVE/SEND/READ/REWRITE/XCTL/
      * RETURN/SYNCPOINT/ABEND). COPY COACTUP/COCOM01Y/CVCUS01Y/
      * CSUTLDPY/CSLKPCDY/CSUTLDWY/CSSETATY resolve; DFHAID+DFHBMSCA
      * stay unresolved BMS holes. No fake CICS/VSAM/date/REPLACING
      * runtime (D6442/D6447). Not a behavioral subject.
      ******************************************************************
       IDENTIFICATION DIVISION.
       PROGRAM-ID. COACTUPC.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-RESP-CD            PIC S9(9) COMP VALUE 0.
       01  WS-ACCT-ID            PIC X(11) VALUE SPACES.
       01  WS-MAP-AREA.
           COPY COACTUP.
       COPY COCOM01Y.
       COPY CVCUS01Y.
       COPY CSUTLDPY.
       COPY CSLKPCDY.
       COPY DFHAID.
       COPY DFHBMSCA.
       LINKAGE SECTION.
       01  DFHCOMMAREA.
           05  CA-OPTION         PIC X(01).
       PROCEDURE DIVISION USING DFHCOMMAREA.
       MAIN-LOGIC SECTION.
           EXEC CICS HANDLE ABEND
                LABEL(P900-ABEND)
           END-EXEC
           EXEC CICS HANDLE CONDITION
                ERROR(P900-ABEND)
                NOTFND(P200-NOTFND)
           END-EXEC
           EXEC CICS RECEIVE MAP('CACTUPA')
                MAPSET('COACTUP')
                INTO(WS-MAP-AREA)
                RESP(WS-RESP-CD)
           END-EXEC
           PERFORM P100-READ-REWRITE
           EXEC CICS SEND MAP('CACTUPA')
                MAPSET('COACTUP')
                FROM(WS-MAP-AREA)
                RESP(WS-RESP-CD)
           END-EXEC
           EXEC CICS SYNCPOINT END-EXEC
           EXEC CICS RETURN END-EXEC
           GOBACK.
       P100-READ-REWRITE.
           EXEC CICS READ
                DATASET('ACCTDAT')
                INTO(WS-MAP-AREA)
                RIDFLD(WS-ACCT-ID)
                RESP(WS-RESP-CD)
           END-EXEC
           EXEC CICS REWRITE
                DATASET('ACCTDAT')
                FROM(WS-MAP-AREA)
                RESP(WS-RESP-CD)
           END-EXEC.
       P200-NOTFND.
           CONTINUE.
       P800-RETURN.
           EXEC CICS XCTL PROGRAM('COMEN01C') END-EXEC.
       P900-ABEND.
           EXEC CICS ABEND ABCODE('CAUP') END-EXEC.
      * Upstream procedure COPYs — CSUTLDWY/CSSETATY resolve under copybook/;
      * DFHAID/DFHBMSCA remain BMS holes (no invented IBM maps).
           COPY CSUTLDWY.
           COPY CSSETATY.
