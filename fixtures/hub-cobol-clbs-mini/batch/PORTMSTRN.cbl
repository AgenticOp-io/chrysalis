      *> CLBS PORTMSTR-shaped portfolio-master CRUD extract (INDEXED-free).
      *> Upstream PORTMSTR: PROCEDURE DIVISION USING + EVALUATE TRUE on
      *> CREATE/READ/UPDATE/DELETE + INDEXED I-O + ERRPROC/AUDPROC.
      *> This runnable adaptation: nested CALL … USING + EVALUATE TRUE on
      *> C/R/U/D 88s only (no INDEXED/VSAM/COPY). Driver runs all four → 108.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. PORTMSTRN.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-CMD             PIC X VALUE 'C'.
           88  CREATE-PORT          VALUE 'C'.
           88  READ-PORT            VALUE 'R'.
           88  UPDATE-PORT          VALUE 'U'.
           88  DELETE-PORT          VALUE 'D'.
       01  WS-RC              PIC 99 VALUE 0.
       01  WS-SUM             PIC 999 VALUE 0.
       01  WS-OUT             PIC 999.
       PROCEDURE DIVISION.
       MAIN.
           MOVE 'C' TO WS-CMD
           CALL "PORTMSTRSB" USING WS-CMD WS-RC
           ADD WS-RC TO WS-SUM
           MOVE 'R' TO WS-CMD
           CALL "PORTMSTRSB" USING WS-CMD WS-RC
           ADD WS-RC TO WS-SUM
           MOVE 'U' TO WS-CMD
           CALL "PORTMSTRSB" USING WS-CMD WS-RC
           ADD WS-RC TO WS-SUM
           MOVE 'D' TO WS-CMD
           CALL "PORTMSTRSB" USING WS-CMD WS-RC
           ADD WS-RC TO WS-SUM
           MOVE WS-SUM TO WS-OUT
           DISPLAY WS-OUT
           GOBACK.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. PORTMSTRSB.
       DATA DIVISION.
       LINKAGE SECTION.
       01  LK-CMD             PIC X.
           88  CREATE-PORT          VALUE 'C'.
           88  READ-PORT            VALUE 'R'.
           88  UPDATE-PORT          VALUE 'U'.
           88  DELETE-PORT          VALUE 'D'.
       01  LK-RC              PIC 99.
       PROCEDURE DIVISION USING LK-CMD LK-RC.
       DISP.
           EVALUATE TRUE
               WHEN CREATE-PORT
                   PERFORM PROC-CREATE
               WHEN READ-PORT
                   PERFORM PROC-READ
               WHEN UPDATE-PORT
                   PERFORM PROC-UPDATE
               WHEN DELETE-PORT
                   PERFORM PROC-DELETE
               WHEN OTHER
                   MOVE 99 TO LK-RC
           END-EVALUATE
           GOBACK.
       PROC-CREATE.
           MOVE 12 TO LK-RC.
       PROC-READ.
           MOVE 22 TO LK-RC.
       PROC-UPDATE.
           MOVE 32 TO LK-RC.
       PROC-DELETE.
           MOVE 42 TO LK-RC.
       END PROGRAM PORTMSTRSB.
       END PROGRAM PORTMSTRN.
