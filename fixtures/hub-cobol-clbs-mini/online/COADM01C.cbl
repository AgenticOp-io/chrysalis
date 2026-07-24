      ******************************************************************
      * CardDemo COADM01C-shaped structural probe (program, not map).
      * Upstream: aws-carddemo app/cbl/COADM01C.cbl — admin menu with
      * CICS map I/O + XCTL to COUSR00C (user list). Catalog EXEC CICS
      * (HANDLE/RECEIVE/SEND/XCTL/RETURN). COPY COADM01/COADM02Y/
      * COCOM01Y/COTTL01Y/CSDAT01Y/CSMSG01Y/CSUSR01Y resolve;
      * DFHAID+DFHBMSCA stay BMS holes. No fake CICS/VSAM runtime
      * (D6442/D6447). Not a behavioral subject.
      ******************************************************************
       IDENTIFICATION DIVISION.
       PROGRAM-ID. COADM01C.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-RESP-CD            PIC S9(9) COMP VALUE 0.
       01  WS-OPTION             PIC 9(02) VALUE 0.
       01  WS-TARGET-PGM         PIC X(08) VALUE SPACES.
       01  WS-MAP-AREA.
           COPY COADM01.
       COPY COADM02Y.
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
           END-EXEC
           EXEC CICS HANDLE AID
                ENTER(P100-DISPATCH)
                PF3(P800-RETURN)
           END-EXEC
           EXEC CICS RECEIVE MAP('COADM1A')
                MAPSET('COADM01')
                INTO(WS-MAP-AREA)
                RESP(WS-RESP-CD)
           END-EXEC
           PERFORM P100-DISPATCH
           EXEC CICS SEND MAP('COADM1A')
                MAPSET('COADM01')
                FROM(WS-MAP-AREA)
                ERASE
                RESP(WS-RESP-CD)
           END-EXEC
           EXEC CICS RETURN END-EXEC
           GOBACK.
       P100-DISPATCH.
           MOVE 'COUSR00C' TO WS-TARGET-PGM
           EXEC CICS XCTL PROGRAM(WS-TARGET-PGM) END-EXEC.
       P800-RETURN.
           EXEC CICS RETURN END-EXEC.
       P900-ABEND.
           EXEC CICS ABEND ABCODE('CADM') END-EXEC.
