      *> CLBS RCVPRC00-shaped recovery-control extract (VSAM-free).
      *> Upstream RCVPRC00: PROCEDURE DIVISION USING + EVALUATE TRUE on
      *> FUNC-INIT/RECV/TERM + INDEXED BCHCTL/PRCSEQ + COPY + ERRPROC.
      *> This runnable adaptation: nested CALL … USING + EVALUATE TRUE on
      *> function 88s only (no sequential-file façade, no VSAM/COPY).
      *> Driver function 'RECV' → return code 12.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. RCVPRCRN.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-FUNC            PIC X(4) VALUE 'RECV'.
           88  FUNC-INIT            VALUE 'INIT'.
           88  FUNC-RECV            VALUE 'RECV'.
           88  FUNC-TERM            VALUE 'TERM'.
       01  WS-RC              PIC 99 VALUE 0.
       01  WS-OUT             PIC 99.
       PROCEDURE DIVISION.
       MAIN.
           CALL "RCVPRCSB" USING WS-FUNC WS-RC
           MOVE WS-RC TO WS-OUT
           DISPLAY WS-OUT
           GOBACK.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. RCVPRCSB.
       DATA DIVISION.
       LINKAGE SECTION.
       01  LK-FUNC            PIC X(4).
           88  FUNC-INIT            VALUE 'INIT'.
           88  FUNC-RECV            VALUE 'RECV'.
           88  FUNC-TERM            VALUE 'TERM'.
       01  LK-RC              PIC 99.
       PROCEDURE DIVISION USING LK-FUNC LK-RC.
       DISP.
           EVALUATE TRUE
               WHEN FUNC-INIT
                   PERFORM PROC-INITIALIZE-RECOVERY
               WHEN FUNC-RECV
                   PERFORM PROC-PROCESS-RECOVERY
               WHEN FUNC-TERM
                   PERFORM PROC-TERMINATE-RECOVERY
               WHEN OTHER
                   MOVE 99 TO LK-RC
           END-EVALUATE
           GOBACK.
       PROC-INITIALIZE-RECOVERY.
           MOVE 0 TO LK-RC.
       PROC-PROCESS-RECOVERY.
           MOVE 12 TO LK-RC.
       PROC-TERMINATE-RECOVERY.
           MOVE 22 TO LK-RC.
       END PROGRAM RCVPRCSB.
       END PROGRAM RCVPRCRN.
