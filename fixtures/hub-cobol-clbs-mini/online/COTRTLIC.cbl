      ******************************************************************
      * CardDemo COTRTLIC-shaped structural probe (programs, not maps).
      * Upstream: aws-carddemo app-transaction-type-db2/cbl/COTRTLIC.cbl
      * — Db2 cursor paging list/update/delete + CICS map I/O.
      * Catalog EXEC SQL (INCLUDE/DECLARE-CURSOR/SELECT/OPEN/FETCH/
      * CLOSE/UPDATE/DELETE) + EXEC CICS (HANDLE/RECEIVE/SEND/XCTL/
      * RETURN/SYNCPOINT). COPY COTRTLI + INCLUDE CSDB2RWY/DCLTRTYP/
      * CSDB2RPY resolve; DFHAID+DFHBMSCA stay BMS holes. No fake
      * CICS/DB2 runtime (D6442/D6447).
      ******************************************************************
       IDENTIFICATION DIVISION.
       PROGRAM-ID. COTRTLIC.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-RESP-CD            PIC S9(9) COMP VALUE 0.
       01  WS-TR-TYPE            PIC X(02) VALUE SPACES.
       01  WS-TR-DESC            PIC X(50) VALUE SPACES.
       01  WS-MAP-AREA.
           COPY COTRTLI.
           EXEC SQL INCLUDE SQLCA END-EXEC.
           EXEC SQL INCLUDE CSDB2RWY END-EXEC.
           EXEC SQL INCLUDE DCLTRTYP END-EXEC.
           EXEC SQL INCLUDE CSDB2RPY END-EXEC.
       COPY DFHAID.
       COPY DFHBMSCA.
       LINKAGE SECTION.
       01  DFHCOMMAREA.
           05  CA-OPTION         PIC X(01).
       PROCEDURE DIVISION USING DFHCOMMAREA.
       MAIN-LOGIC SECTION.
           EXEC CICS HANDLE CONDITION
                ERROR(P900-ABEND)
                NOTFND(P900-ABEND)
           END-EXEC
           EXEC CICS HANDLE AID
                ENTER(P100-PROCESS)
                PF3(P800-RETURN)
           END-EXEC
           EXEC CICS RECEIVE MAP('CTRTLIA')
                MAPSET('COTRTLI')
                INTO(WS-MAP-AREA)
                RESP(WS-RESP-CD)
           END-EXEC
           PERFORM P100-PROCESS
           EXEC CICS SEND MAP('CTRTLIA')
                MAPSET('COTRTLI')
                FROM(WS-MAP-AREA)
                RESP(WS-RESP-CD)
           END-EXEC
           EXEC CICS RETURN END-EXEC
           GOBACK.
       P100-PROCESS.
           PERFORM 2000-OPEN-CURSOR
           PERFORM 2100-FETCH-PAGE
           PERFORM 2200-APPLY-UPDATES
           PERFORM 2300-CLOSE-CURSOR
           EXEC CICS SYNCPOINT END-EXEC.
       2000-OPEN-CURSOR.
           EXEC SQL
               DECLARE C-TR-TYPE-FORWARD CURSOR FOR
                   SELECT TR_TYPE, TR_DESCRIPTION
                     FROM TRANSACTION_TYPE
                    WHERE TR_TYPE >= :WS-TR-TYPE
           END-EXEC
           EXEC SQL OPEN C-TR-TYPE-FORWARD END-EXEC.
       2100-FETCH-PAGE.
           EXEC SQL
               FETCH C-TR-TYPE-FORWARD
                INTO :WS-TR-TYPE, :WS-TR-DESC
           END-EXEC
           EXEC SQL
               SELECT TR_DESCRIPTION INTO :WS-TR-DESC
                 FROM TRANSACTION_TYPE
                WHERE TR_TYPE = :WS-TR-TYPE
           END-EXEC.
       2200-APPLY-UPDATES.
           EXEC SQL
               UPDATE TRANSACTION_TYPE
                  SET TR_DESCRIPTION = :WS-TR-DESC
                WHERE TR_TYPE = :WS-TR-TYPE
           END-EXEC
           EXEC SQL
               DELETE FROM TRANSACTION_TYPE
                WHERE TR_TYPE = :WS-TR-TYPE
           END-EXEC.
       2300-CLOSE-CURSOR.
           EXEC SQL CLOSE C-TR-TYPE-FORWARD END-EXEC.
       P800-RETURN.
           EXEC CICS XCTL PROGRAM('COADM01C') END-EXEC.
       P900-ABEND.
           EXEC CICS ABEND ABCODE('CTLI') END-EXEC.
