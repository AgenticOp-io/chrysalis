      ******************************************************************
      * CardDemo COBTUPDT-shaped structural probe (batch Db2 maintain).
      * Upstream: app-transaction-type-db2/cbl/COBTUPDT.cbl — sequential
      * INPFILE A/U/D/* + EXEC SQL INSERT/UPDATE/DELETE on TRANSACTION_TYPE.
      * Driven by MNTTRDB2 (IKJEFT01 RUN PROGRAM(COBTUPDT)). INCLUDE
      * SQLCA/DCLTRTYP resolve; SQL + sequential I/O stay honest holes.
      * No invented DB2/JES runtime (D6442/D6447).
      ******************************************************************
       IDENTIFICATION DIVISION.
       PROGRAM-ID. COBTUPDT.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT TR-RECORD ASSIGN TO "INPFILE"
               ORGANIZATION IS SEQUENTIAL
               ACCESS MODE IS SEQUENTIAL
               FILE STATUS IS WS-INF-STATUS.
       DATA DIVISION.
       FILE SECTION.
       FD  TR-RECORD.
       01  WS-INPUT-REC.
           05  INPUT-REC-TYPE        PIC X(1).
           05  INPUT-REC-NUMBER      PIC X(2).
           05  INPUT-REC-DESC        PIC X(50).
       WORKING-STORAGE SECTION.
           EXEC SQL INCLUDE SQLCA END-EXEC.
           EXEC SQL INCLUDE DCLTRTYP END-EXEC.
       01  LASTREC                   PIC X VALUE SPACE.
       01  WS-INF-STATUS             PIC X(2).
       01  WS-VAR-SQLCODE            PIC ----9.
       PROCEDURE DIVISION.
       0001-MAIN.
           OPEN INPUT TR-RECORD
           PERFORM 1002-READ-RECORDS
           PERFORM UNTIL LASTREC = 'Y'
               PERFORM 1003-TREAT-RECORD
               PERFORM 1002-READ-RECORDS
           END-PERFORM
           CLOSE TR-RECORD
           GOBACK.
       1002-READ-RECORDS.
           READ TR-RECORD
               AT END
                   MOVE 'Y' TO LASTREC
           END-READ.
       1003-TREAT-RECORD.
           EVALUATE INPUT-REC-TYPE
               WHEN 'A'
                   PERFORM 10031-INSERT-DB
               WHEN 'U'
                   PERFORM 10032-UPDATE-DB
               WHEN 'D'
                   PERFORM 10033-DELETE-DB
               WHEN '*'
                   CONTINUE
               WHEN OTHER
                   CONTINUE
           END-EVALUATE.
       10031-INSERT-DB.
           EXEC SQL
               INSERT INTO CARDDEMO.TRANSACTION_TYPE
                   (TR_TYPE, TR_DESCRIPTION)
               VALUES (:INPUT-REC-NUMBER, :INPUT-REC-DESC)
           END-EXEC
           MOVE SQLCODE TO WS-VAR-SQLCODE.
       10032-UPDATE-DB.
           EXEC SQL
               UPDATE CARDDEMO.TRANSACTION_TYPE
                  SET TR_DESCRIPTION = :INPUT-REC-DESC
                WHERE TR_TYPE = :INPUT-REC-NUMBER
           END-EXEC
           MOVE SQLCODE TO WS-VAR-SQLCODE.
       10033-DELETE-DB.
           EXEC SQL
               DELETE FROM CARDDEMO.TRANSACTION_TYPE
                WHERE TR_TYPE = :INPUT-REC-NUMBER
           END-EXEC
           MOVE SQLCODE TO WS-VAR-SQLCODE.
