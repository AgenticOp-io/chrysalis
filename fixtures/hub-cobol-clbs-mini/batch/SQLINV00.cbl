      *> EXEC SQL structural inventory — honest holes, no DB2 runtime.
      *> Catalog: INCLUDE / DECLARE CURSOR / SELECT / INSERT / UPDATE /
      *> DELETE / OPEN / FETCH / CLOSE / COMMIT / ROLLBACK.
      *> EXEC SQL INCLUDE SQLCA resolves SQLCA.cpy (dual vs COPY SQLCA on
      *> SQLCPY00 / HISTLD00) — still not a DB2 runtime.
      *> Upstream: _upstream/HISTLD00.cbl (COPY SQLCA + INSERT+COMMIT),
      *> _upstream/CBLDB21.cbl. Runnable non-SQL load: batch/HISTLDRN.cbl.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. SQLINV00.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
           EXEC SQL BEGIN DECLARE SECTION END-EXEC.
       01  WS-ACCT-ID            PIC X(10).
       01  WS-AMT                PIC S9(7)V99 COMP-3.
           EXEC SQL END DECLARE SECTION END-EXEC.
           EXEC SQL INCLUDE SQLCA END-EXEC.
       PROCEDURE DIVISION.
       0000-MAIN.
           PERFORM 1000-DECLARE
           PERFORM 2000-DML
           PERFORM 3000-CURSOR
           PERFORM 4000-TXN
           GOBACK.
       1000-DECLARE.
           EXEC SQL
               DECLARE POSHIST TABLE
               ( ACCT_ID CHAR(10)
               , AMT DECIMAL(9,2)
               )
           END-EXEC
           EXEC SQL
               DECLARE CUR1 CURSOR FOR
                   SELECT ACCT_ID, AMT FROM POSHIST
                    WHERE ACCT_ID = :WS-ACCT-ID
           END-EXEC.
       2000-DML.
           EXEC SQL
               INSERT INTO POSHIST VALUES (:WS-ACCT-ID, :WS-AMT)
           END-EXEC
           EXEC SQL
               UPDATE POSHIST SET AMT = :WS-AMT
                WHERE ACCT_ID = :WS-ACCT-ID
           END-EXEC
           EXEC SQL
               DELETE FROM POSHIST WHERE ACCT_ID = :WS-ACCT-ID
           END-EXEC
           EXEC SQL
               SELECT AMT INTO :WS-AMT FROM POSHIST
                WHERE ACCT_ID = :WS-ACCT-ID
           END-EXEC.
       3000-CURSOR.
           EXEC SQL OPEN CUR1 END-EXEC
           EXEC SQL FETCH CUR1 INTO :WS-ACCT-ID, :WS-AMT END-EXEC
           EXEC SQL CLOSE CUR1 END-EXEC.
       4000-TXN.
           EXEC SQL COMMIT WORK END-EXEC
           EXEC SQL ROLLBACK WORK END-EXEC.
