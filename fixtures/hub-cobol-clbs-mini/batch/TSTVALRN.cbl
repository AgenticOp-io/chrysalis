      *> CLBS TSTVAL00-shaped test-validation control extract (file-free).
      *> Upstream TSTVAL00: sequential TEST-CASES/EXPECTED/ACTUAL/REPORT +
      *> EVALUATE TEST-TYPE FUNCTIONAL/INTEGRATE/PERFORM/ERROR (COPY).
      *> This runnable adaptation: nested CALL … USING + EVALUATE TRUE on
      *> FUNC-FUNC/INTG/PERF/ERR only (no sequential-file façade).
      *> Driver function 'PERF' → return code 31.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. TSTVALRN.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-FUNC            PIC X(4) VALUE 'PERF'.
           88  FUNC-INIT            VALUE 'INIT'.
           88  FUNC-FUNC            VALUE 'FUNC'.
           88  FUNC-INTG            VALUE 'INTG'.
           88  FUNC-PERF            VALUE 'PERF'.
           88  FUNC-ERR             VALUE 'ERR'.
       01  WS-RC              PIC 99 VALUE 0.
       01  WS-OUT             PIC 99.
       PROCEDURE DIVISION.
       MAIN.
           CALL "TSTVALSB" USING WS-FUNC WS-RC
           MOVE WS-RC TO WS-OUT
           DISPLAY WS-OUT
           GOBACK.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. TSTVALSB.
       DATA DIVISION.
       LINKAGE SECTION.
       01  LK-FUNC            PIC X(4).
           88  FUNC-INIT            VALUE 'INIT'.
           88  FUNC-FUNC            VALUE 'FUNC'.
           88  FUNC-INTG            VALUE 'INTG'.
           88  FUNC-PERF            VALUE 'PERF'.
           88  FUNC-ERR             VALUE 'ERR'.
       01  LK-RC              PIC 99.
       PROCEDURE DIVISION USING LK-FUNC LK-RC.
       DISP.
           EVALUATE TRUE
               WHEN FUNC-INIT
                   PERFORM PROC-INIT-TESTS
               WHEN FUNC-FUNC
                   PERFORM PROC-RUN-FUNCTIONAL
               WHEN FUNC-INTG
                   PERFORM PROC-RUN-INTEGRATION
               WHEN FUNC-PERF
                   PERFORM PROC-RUN-PERFORMANCE
               WHEN FUNC-ERR
                   PERFORM PROC-RUN-ERROR-TEST
               WHEN OTHER
                   MOVE 99 TO LK-RC
           END-EVALUATE
           GOBACK.
       PROC-INIT-TESTS.
           MOVE 0 TO LK-RC.
       PROC-RUN-FUNCTIONAL.
           MOVE 11 TO LK-RC.
       PROC-RUN-INTEGRATION.
           MOVE 21 TO LK-RC.
       PROC-RUN-PERFORMANCE.
           MOVE 31 TO LK-RC.
       PROC-RUN-ERROR-TEST.
           MOVE 41 TO LK-RC.
       END PROGRAM TSTVALSB.
       END PROGRAM TSTVALRN.
