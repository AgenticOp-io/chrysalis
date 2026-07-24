      ******************************************************************
      * CardDemo COACTVWC-shaped structural probe (program, not map).
      * Upstream: aws-carddemo app/cbl/COACTVWC.cbl — account view
      * (READ-only VSAM + CICS map I/O + SEND TEXT). Sibling of
      * COACTUPC; COMEN01C XCTLs here as menu option 1.
      * Catalog EXEC CICS (HANDLE/RECEIVE/SEND/READ/XCTL/RETURN/ABEND).
      * COPY COACTVW/COCOM01Y/CVACT*/CVCUS01Y/CVCRD01Y/COTTL01Y/
      * CSDAT01Y/CSMSG*/CSUSR01Y/CSSTRPFY resolve; DFHAID+DFHBMSCA
      * stay BMS holes. No REWRITE/SQL; no fake CICS/VSAM runtime
      * (D6442/D6447). Not a behavioral subject.
      ******************************************************************
       IDENTIFICATION DIVISION.
       PROGRAM-ID. COACTVWC.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-RESP-CD            PIC S9(9) COMP VALUE 0.
       01  WS-ACCT-ID            PIC X(11) VALUE SPACES.
       01  WS-MAP-AREA.
           COPY COACTVW.
       COPY COCOM01Y.
       COPY CVACT01Y.
       COPY CVACT02Y.
       COPY CVACT03Y.
       COPY CVCUS01Y.
       COPY CVCRD01Y.
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
           EXEC CICS RECEIVE MAP('CACTVWA')
                MAPSET('COACTVW')
                INTO(WS-MAP-AREA)
                RESP(WS-RESP-CD)
           END-EXEC
           PERFORM P100-READ-VIEW
           EXEC CICS SEND MAP('CACTVWA')
                MAPSET('COACTVW')
                FROM(WS-MAP-AREA)
                RESP(WS-RESP-CD)
           END-EXEC
           EXEC CICS RETURN END-EXEC
           GOBACK.
       P100-READ-VIEW.
           EXEC CICS READ
                DATASET('ACCTDAT')
                INTO(WS-MAP-AREA)
                RIDFLD(WS-ACCT-ID)
                RESP(WS-RESP-CD)
           END-EXEC
           EXEC CICS SEND TEXT
                FROM(WS-MAP-AREA)
                RESP(WS-RESP-CD)
           END-EXEC.
       P200-NOTFND.
           CONTINUE.
       P800-RETURN.
           EXEC CICS XCTL PROGRAM('COMEN01C') END-EXEC.
       P900-ABEND.
           EXEC CICS ABEND ABCODE('CAVW') END-EXEC.
