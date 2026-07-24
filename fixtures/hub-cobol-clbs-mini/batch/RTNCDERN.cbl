      *> CLBS RTNCDE00-shaped return-code control extract (DB2-free).
      *> Upstream RTNCDE00: PROCEDURE DIVISION USING + EVALUATE TRUE on
      *> RC-INITIALIZE/SET/GET/LOG/ANALYZE + COPY RTNCODE + SQL INSERT/SELECT.
      *> This runnable adaptation: nested CALL … USING + EVALUATE TRUE on
      *> FUNC-INIT/SETC/GETC/ANLZ only (no SQL/COPY; LOG stays upstream hole).
      *> Driver function 'SETC' → return code 06.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. RTNCDERN.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-FUNC            PIC X(4) VALUE 'SETC'.
           88  FUNC-INIT            VALUE 'INIT'.
           88  FUNC-SETC            VALUE 'SETC'.
           88  FUNC-GETC            VALUE 'GETC'.
           88  FUNC-ANLZ            VALUE 'ANLZ'.
       01  WS-RC              PIC 99 VALUE 0.
       01  WS-OUT             PIC 99.
       PROCEDURE DIVISION.
       MAIN.
           CALL "RTNCDESB" USING WS-FUNC WS-RC
           MOVE WS-RC TO WS-OUT
           DISPLAY WS-OUT
           GOBACK.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. RTNCDESB.
       DATA DIVISION.
       LINKAGE SECTION.
       01  LK-FUNC            PIC X(4).
           88  FUNC-INIT            VALUE 'INIT'.
           88  FUNC-SETC            VALUE 'SETC'.
           88  FUNC-GETC            VALUE 'GETC'.
           88  FUNC-ANLZ            VALUE 'ANLZ'.
       01  LK-RC              PIC 99.
       PROCEDURE DIVISION USING LK-FUNC LK-RC.
       DISP.
           EVALUATE TRUE
               WHEN FUNC-INIT
                   PERFORM PROC-INIT-CODES
               WHEN FUNC-SETC
                   PERFORM PROC-SET-CODE
               WHEN FUNC-GETC
                   PERFORM PROC-GET-CODE
               WHEN FUNC-ANLZ
                   PERFORM PROC-ANALYZE-CODES
               WHEN OTHER
                   MOVE 99 TO LK-RC
           END-EVALUATE
           GOBACK.
       PROC-INIT-CODES.
           MOVE 0 TO LK-RC.
       PROC-SET-CODE.
           MOVE 6 TO LK-RC.
       PROC-GET-CODE.
           MOVE 16 TO LK-RC.
       PROC-ANALYZE-CODES.
           MOVE 26 TO LK-RC.
       END PROGRAM RTNCDESB.
       END PROGRAM RTNCDERN.
