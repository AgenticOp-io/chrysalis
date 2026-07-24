      *> CLBS PORTVALD-shaped portfolio-validation extract (COPY-free).
      *> Upstream PORTVALD: PROCEDURE DIVISION USING + EVALUATE TRUE on
      *> VAL-ID/ACCT/TYPE/AMT + COPY PORTVAL constants (CICS/VSAM-free).
      *> This runnable adaptation: nested CALL … USING + EVALUATE TRUE on
      *> FUNC-VID/VACT/VTYP/VAMT with PORTVALD-shaped type membership check
      *> for VTYP (STK/BND/MMF/ETF). Driver function 'VTYP' → return code 31.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. PORTVALRN.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-FUNC            PIC X(4) VALUE 'VTYP'.
           88  FUNC-INIT            VALUE 'INIT'.
           88  FUNC-VID             VALUE 'VID'.
           88  FUNC-VACT            VALUE 'VACT'.
           88  FUNC-VTYP            VALUE 'VTYP'.
           88  FUNC-VAMT            VALUE 'VAMT'.
       01  WS-RC              PIC 99 VALUE 0.
       01  WS-OUT             PIC 99.
       PROCEDURE DIVISION.
       MAIN.
           CALL "PORTVALSB" USING WS-FUNC WS-RC
           MOVE WS-RC TO WS-OUT
           DISPLAY WS-OUT
           GOBACK.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. PORTVALSB.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-TYPE-SAMPLE     PIC X(3) VALUE 'ETF'.
       LINKAGE SECTION.
       01  LK-FUNC            PIC X(4).
           88  FUNC-INIT            VALUE 'INIT'.
           88  FUNC-VID             VALUE 'VID'.
           88  FUNC-VACT            VALUE 'VACT'.
           88  FUNC-VTYP            VALUE 'VTYP'.
           88  FUNC-VAMT            VALUE 'VAMT'.
       01  LK-RC              PIC 99.
       PROCEDURE DIVISION USING LK-FUNC LK-RC.
       DISP.
           EVALUATE TRUE
               WHEN FUNC-INIT
                   PERFORM PROC-INIT-VALID
               WHEN FUNC-VID
                   PERFORM PROC-VALIDATE-ID
               WHEN FUNC-VACT
                   PERFORM PROC-VALIDATE-ACCOUNT
               WHEN FUNC-VTYP
                   PERFORM PROC-VALIDATE-TYPE
               WHEN FUNC-VAMT
                   PERFORM PROC-VALIDATE-AMOUNT
               WHEN OTHER
                   MOVE 99 TO LK-RC
           END-EVALUATE
           GOBACK.
       PROC-INIT-VALID.
           MOVE 0 TO LK-RC.
       PROC-VALIDATE-ID.
           MOVE 11 TO LK-RC.
       PROC-VALIDATE-ACCOUNT.
           MOVE 21 TO LK-RC.
       PROC-VALIDATE-TYPE.
           IF WS-TYPE-SAMPLE = 'STK'
              OR WS-TYPE-SAMPLE = 'BND'
              OR WS-TYPE-SAMPLE = 'MMF'
              OR WS-TYPE-SAMPLE = 'ETF'
               MOVE 31 TO LK-RC
           ELSE
               MOVE 3 TO LK-RC
           END-IF.
       PROC-VALIDATE-AMOUNT.
           MOVE 41 TO LK-RC.
       END PROGRAM PORTVALSB.
       END PROGRAM PORTVALRN.
