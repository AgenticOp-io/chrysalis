      ******************************************************************
      * CardDemo COTRTUPC-shaped structural probe (programs, not maps).
      * Upstream: aws-carddemo app-transaction-type-db2/cbl/COTRTUPC.cbl
      * — Db2 transaction-type add/edit + CICS map I/O.
      * Catalog EXEC SQL (INCLUDE/SELECT/INSERT/UPDATE/DELETE) + EXEC CICS
      * (HANDLE/RECEIVE/SEND/XCTL/RETURN/SYNCPOINT/ABEND). COPY COTRTUP +
      * INCLUDE DCLTRTYP/DCLTRCAT + CVCRD01Y/CSMSG02Y/CSSTRPFY resolve;
      * CSUTLDWY/CSSETATY stay unresolved holes; DFHAID+DFHBMSCA BMS holes.
      * No fake runtime (D6442/D6447).
      ******************************************************************
       IDENTIFICATION DIVISION.
       PROGRAM-ID. COTRTUPC.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-RESP-CD            PIC S9(9) COMP VALUE 0.
       01  WS-TR-TYPE            PIC X(02) VALUE SPACES.
       01  WS-TR-DESC            PIC X(50) VALUE SPACES.
       01  WS-MAP-AREA.
           COPY COTRTUP.
           EXEC SQL INCLUDE SQLCA END-EXEC.
           EXEC SQL INCLUDE DCLTRTYP END-EXEC.
           EXEC SQL INCLUDE DCLTRCAT END-EXEC.
       COPY CVCRD01Y.
       COPY CSMSG02Y.
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
                NOTFND(P200-PROMPT-CREATE)
           END-EXEC
           EXEC CICS RECEIVE MAP('CTRTUPA')
                MAPSET('COTRTUP')
                INTO(WS-MAP-AREA)
                RESP(WS-RESP-CD)
           END-EXEC
           PERFORM P100-READ-OR-WRITE
           EXEC CICS SEND MAP('CTRTUPA')
                MAPSET('COTRTUP')
                FROM(WS-MAP-AREA)
                RESP(WS-RESP-CD)
           END-EXEC
           EXEC CICS SYNCPOINT END-EXEC
           EXEC CICS RETURN END-EXEC
           GOBACK.
       P100-READ-OR-WRITE.
           EXEC SQL
               SELECT TR_TYPE, TR_DESCRIPTION
                 INTO :WS-TR-TYPE, :WS-TR-DESC
                 FROM TRANSACTION_TYPE
                WHERE TR_TYPE = :WS-TR-TYPE
           END-EXEC
           EXEC SQL
               INSERT INTO TRANSACTION_TYPE
                    (TR_TYPE, TR_DESCRIPTION)
             VALUES (:WS-TR-TYPE, :WS-TR-DESC)
           END-EXEC
           EXEC SQL
               UPDATE TRANSACTION_TYPE
                  SET TR_DESCRIPTION = :WS-TR-DESC
                WHERE TR_TYPE = :WS-TR-TYPE
           END-EXEC
           EXEC SQL
               DELETE FROM TRANSACTION_TYPE
                WHERE TR_TYPE = :WS-TR-TYPE
           END-EXEC.
       P200-PROMPT-CREATE.
           CONTINUE.
       P800-RETURN.
           EXEC CICS XCTL PROGRAM('COTRTLIC') END-EXEC.
       P900-ABEND.
           EXEC CICS ABEND ABCODE('CTTU') END-EXEC.
      * Upstream procedure COPYs — CSSTRPFY resolves; date/REPLACING
      * CSUTLDWY/CSSETATY stay honest unresolved holes.
           COPY CSSTRPFY.
           COPY CSUTLDWY.
           COPY CSSETATY.
