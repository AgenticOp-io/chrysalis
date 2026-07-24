      ******************************************************************
      * CardDemo COCRDSLC-shaped structural probe (program, not map).
      * Upstream: aws-carddemo app/cbl/COCRDSLC.cbl — credit card view
      * (RECEIVE/SEND + READ card/VSAM + XCTL/RETURN/ABEND).
      * Catalog EXEC CICS ops; COPY COCRDSL/COCOM01Y/CVCRD01Y/CVACT02Y/
      * CVCUS01Y/COTTL01Y/CSDAT01Y/CSMSG01Y/CSMSG02Y/CSUSR01Y/CSSTRPFY
      * resolve; DFHAID+DFHBMSCA stay BMS holes. file-io hole — no fake
      * CICS/VSAM runtime (D6442/D6447). Not behavioral.
      ******************************************************************
       IDENTIFICATION DIVISION.
       PROGRAM-ID. COCRDSLC.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-RESP-CD            PIC S9(9) COMP VALUE 0.
       01  WS-CARD-ID            PIC X(16) VALUE SPACES.
       01  WS-MAP-AREA.
           COPY COCRDSL.
       COPY COCOM01Y.
       COPY CVCRD01Y.
       COPY CVACT02Y.
       COPY CVCUS01Y.
       COPY COTTL01Y.
       COPY CSDAT01Y.
       COPY CSMSG01Y.
       COPY CSMSG02Y.
       COPY CSUSR01Y.
       COPY CSSTRPFY.
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
           EXEC CICS RECEIVE MAP('CCRDSLA')
                MAPSET('COCRDSL')
                INTO(WS-MAP-AREA)
                RESP(WS-RESP-CD)
           END-EXEC
           PERFORM P100-CARD-VIEW
           EXEC CICS SEND MAP('CCRDSLA')
                MAPSET('COCRDSL')
                FROM(WS-MAP-AREA)
                RESP(WS-RESP-CD)
           END-EXEC
           EXEC CICS RETURN END-EXEC
           GOBACK.
       P100-CARD-VIEW.
           EXEC CICS READ
                DATASET('CARDDAT')
                INTO(WS-MAP-AREA)
                RIDFLD(WS-CARD-ID)
                RESP(WS-RESP-CD)
           END-EXEC
           EXEC CICS SEND TEXT
                FROM(WS-MAP-AREA)
                RESP(WS-RESP-CD)
           END-EXEC.
       P200-NOTFND.
           CONTINUE.
       P800-RETURN.
           EXEC CICS XCTL PROGRAM('COCRDLIC') END-EXEC.
       P900-ABEND.
           EXEC CICS ABEND ABCODE('CCDL') END-EXEC.
