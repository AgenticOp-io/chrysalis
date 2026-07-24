      ******************************************************************
      * CardDemo COMEN01C-shaped structural probe (program, not map).
      * Upstream: aws-carddemo app/cbl/COMEN01C.cbl — main menu with
      * CICS INQUIRE + XCTL dispatch table (COMEN02Y options).
      * Catalog EXEC CICS (HANDLE/RECEIVE/SEND/INQUIRE/XCTL/RETURN).
      * COPY COMEN01/COMEN02Y/COCOM01Y resolve; DFHAID+DFHBMSCA stay
      * BMS holes. No fake CICS runtime (D6442/D6447). Not behavioral.
      ******************************************************************
       IDENTIFICATION DIVISION.
       PROGRAM-ID. COMEN01C.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-RESP-CD            PIC S9(9) COMP VALUE 0.
       01  WS-OPTION             PIC 9(02) VALUE 0.
       01  WS-TARGET-PGM         PIC X(08) VALUE SPACES.
       01  WS-MAP-AREA.
           COPY COMEN01.
       COPY COCOM01Y.
       COPY COMEN02Y.
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
           EXEC CICS INQUIRE
                SYSTEM
                RESP(WS-RESP-CD)
           END-EXEC
           EXEC CICS RECEIVE MAP('COMEN1A')
                MAPSET('COMEN01')
                INTO(WS-MAP-AREA)
                RESP(WS-RESP-CD)
           END-EXEC
           PERFORM P100-DISPATCH
           EXEC CICS SEND MAP('COMEN1A')
                MAPSET('COMEN01')
                FROM(WS-MAP-AREA)
                RESP(WS-RESP-CD)
           END-EXEC
           EXEC CICS RETURN END-EXEC
           GOBACK.
       P100-DISPATCH.
           MOVE 'COACTVWC' TO WS-TARGET-PGM
           EXEC CICS XCTL PROGRAM(WS-TARGET-PGM) END-EXEC.
       P800-RETURN.
           EXEC CICS RETURN END-EXEC.
       P900-ABEND.
           EXEC CICS ABEND ABCODE('CMEN') END-EXEC.
