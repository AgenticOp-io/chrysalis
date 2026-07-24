      *> CLBS PRCSEQ00-shaped process-sequence control extract (VSAM-free).
      *> Upstream PRCSEQ00: PROCEDURE DIVISION USING + EVALUATE TRUE on
      *> FUNC-INIT/NEXT/STAT/TERM + INDEXED sequence/control files + COPY.
      *> This runnable adaptation: nested CALL … USING + EVALUATE TRUE on
      *> function 88s only (no sequential-file façade, no VSAM/COPY).
      *> Driver function 'NEXT' → return code 10.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. PRCSEQRN.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-FUNC            PIC X(4) VALUE 'NEXT'.
           88  FUNC-INIT            VALUE 'INIT'.
           88  FUNC-NEXT            VALUE 'NEXT'.
           88  FUNC-STAT            VALUE 'STAT'.
           88  FUNC-TERM            VALUE 'TERM'.
       01  WS-RC              PIC 99 VALUE 0.
       01  WS-OUT             PIC 99.
       PROCEDURE DIVISION.
       MAIN.
           CALL "PRCSEQSB" USING WS-FUNC WS-RC
           MOVE WS-RC TO WS-OUT
           DISPLAY WS-OUT
           GOBACK.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. PRCSEQSB.
       DATA DIVISION.
       LINKAGE SECTION.
       01  LK-FUNC            PIC X(4).
           88  FUNC-INIT            VALUE 'INIT'.
           88  FUNC-NEXT            VALUE 'NEXT'.
           88  FUNC-STAT            VALUE 'STAT'.
           88  FUNC-TERM            VALUE 'TERM'.
       01  LK-RC              PIC 99.
       PROCEDURE DIVISION USING LK-FUNC LK-RC.
       DISP.
           EVALUATE TRUE
               WHEN FUNC-INIT
                   PERFORM PROC-INIT
               WHEN FUNC-NEXT
                   PERFORM PROC-GET-NEXT
               WHEN FUNC-STAT
                   PERFORM PROC-CHECK-STATUS
               WHEN FUNC-TERM
                   PERFORM PROC-TERMINATE
               WHEN OTHER
                   MOVE 99 TO LK-RC
           END-EVALUATE
           GOBACK.
       PROC-INIT.
           MOVE 0 TO LK-RC.
       PROC-GET-NEXT.
           MOVE 10 TO LK-RC.
       PROC-CHECK-STATUS.
           MOVE 20 TO LK-RC.
       PROC-TERMINATE.
           MOVE 30 TO LK-RC.
       END PROGRAM PRCSEQSB.
       END PROGRAM PRCSEQRN.
