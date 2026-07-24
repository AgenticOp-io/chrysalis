      *> CLBS BCHCTL00-shaped batch-control extract (VSAM-free).
      *> Upstream BCHCTL00: PROCEDURE DIVISION USING + EVALUATE TRUE on
      *> FUNC-INIT/CHEK/UPDT/TERM + INDEXED control file + COPY.
      *> This runnable adaptation: nested CALL … USING + EVALUATE TRUE on
      *> function 88s only (no sequential-file façade, no VSAM/COPY).
      *> Driver function 'CHEK' → return code 15.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. BCHCTLRN.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-FUNC            PIC X(4) VALUE 'CHEK'.
           88  FUNC-INIT            VALUE 'INIT'.
           88  FUNC-CHEK            VALUE 'CHEK'.
           88  FUNC-UPDT            VALUE 'UPDT'.
           88  FUNC-TERM            VALUE 'TERM'.
       01  WS-RC              PIC 99 VALUE 0.
       01  WS-OUT             PIC 99.
       PROCEDURE DIVISION.
       MAIN.
           CALL "BCHCTLSB" USING WS-FUNC WS-RC
           MOVE WS-RC TO WS-OUT
           DISPLAY WS-OUT
           GOBACK.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. BCHCTLSB.
       DATA DIVISION.
       LINKAGE SECTION.
       01  LK-FUNC            PIC X(4).
           88  FUNC-INIT            VALUE 'INIT'.
           88  FUNC-CHEK            VALUE 'CHEK'.
           88  FUNC-UPDT            VALUE 'UPDT'.
           88  FUNC-TERM            VALUE 'TERM'.
       01  LK-RC              PIC 99.
       PROCEDURE DIVISION USING LK-FUNC LK-RC.
       DISP.
           EVALUATE TRUE
               WHEN FUNC-INIT
                   PERFORM PROC-INITIALIZE
               WHEN FUNC-CHEK
                   PERFORM PROC-CHECK-PREREQ
               WHEN FUNC-UPDT
                   PERFORM PROC-UPDATE-STATUS
               WHEN FUNC-TERM
                   PERFORM PROC-TERMINATE
               WHEN OTHER
                   MOVE 99 TO LK-RC
           END-EVALUATE
           GOBACK.
       PROC-INITIALIZE.
           MOVE 0 TO LK-RC.
       PROC-CHECK-PREREQ.
           MOVE 15 TO LK-RC.
       PROC-UPDATE-STATUS.
           MOVE 25 TO LK-RC.
       PROC-TERMINATE.
           MOVE 35 TO LK-RC.
       END PROGRAM BCHCTLSB.
       END PROGRAM BCHCTLRN.
