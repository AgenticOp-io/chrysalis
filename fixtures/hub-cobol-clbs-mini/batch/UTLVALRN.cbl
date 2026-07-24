      *> CLBS UTLVAL00-shaped validation-control extract (INDEXED/VSAM-free).
      *> Note: CLBS has UTLVAL00 (not TRNVAL00) — data validation utility.
      *> Upstream UTLVAL00: sequential VALIDATION-CONTROL + EVALUATE VAL-TYPE
      *> INTEGRITY/XREF/FORMAT/BALANCE + INDEXED POS/TRAN + COPY.
      *> This runnable adaptation: nested CALL … USING + EVALUATE TRUE on
      *> FUNC-INIT/INTG/XREF/FMT/BAL only (no sequential-file façade, no VSAM).
      *> Driver function 'BAL' → return code 38.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. UTLVALRN.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-FUNC            PIC X(4) VALUE 'BAL'.
           88  FUNC-INIT            VALUE 'INIT'.
           88  FUNC-INTG            VALUE 'INTG'.
           88  FUNC-XREF            VALUE 'XREF'.
           88  FUNC-FMT             VALUE 'FMT'.
           88  FUNC-BAL             VALUE 'BAL'.
       01  WS-RC              PIC 99 VALUE 0.
       01  WS-OUT             PIC 99.
       PROCEDURE DIVISION.
       MAIN.
           CALL "UTLVALSB" USING WS-FUNC WS-RC
           MOVE WS-RC TO WS-OUT
           DISPLAY WS-OUT
           GOBACK.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. UTLVALSB.
       DATA DIVISION.
       LINKAGE SECTION.
       01  LK-FUNC            PIC X(4).
           88  FUNC-INIT            VALUE 'INIT'.
           88  FUNC-INTG            VALUE 'INTG'.
           88  FUNC-XREF            VALUE 'XREF'.
           88  FUNC-FMT             VALUE 'FMT'.
           88  FUNC-BAL             VALUE 'BAL'.
       01  LK-RC              PIC 99.
       PROCEDURE DIVISION USING LK-FUNC LK-RC.
       DISP.
           EVALUATE TRUE
               WHEN FUNC-INIT
                   PERFORM PROC-INIT-VALID
               WHEN FUNC-INTG
                   PERFORM PROC-CHECK-INTEGRITY
               WHEN FUNC-XREF
                   PERFORM PROC-CHECK-XREF
               WHEN FUNC-FMT
                   PERFORM PROC-CHECK-FORMAT
               WHEN FUNC-BAL
                   PERFORM PROC-CHECK-BALANCE
               WHEN OTHER
                   MOVE 99 TO LK-RC
           END-EVALUATE
           GOBACK.
       PROC-INIT-VALID.
           MOVE 0 TO LK-RC.
       PROC-CHECK-INTEGRITY.
           MOVE 8 TO LK-RC.
       PROC-CHECK-XREF.
           MOVE 18 TO LK-RC.
       PROC-CHECK-FORMAT.
           MOVE 28 TO LK-RC.
       PROC-CHECK-BALANCE.
           MOVE 38 TO LK-RC.
       END PROGRAM UTLVALSB.
       END PROGRAM UTLVALRN.
