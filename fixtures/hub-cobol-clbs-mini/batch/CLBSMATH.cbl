      *> CLBS-shaped batch rounding mini - GnuCOBOL runnable
      *> Parallel prove: 1000.00 * 0.0525 rounded = 52.50
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CLBSMATH.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-AMOUNT         PIC 9(7)V99 VALUE 1000.00.
       01  WS-RATE           PIC 9V9(4) VALUE 0.0525.
       01  WS-RESULT         PIC 9(7)V99 VALUE 0.
       01  WS-OUT            PIC ZZZZ9.99.
       PROCEDURE DIVISION.
       MAIN.
           COMPUTE WS-RESULT ROUNDED = WS-AMOUNT * WS-RATE
           MOVE WS-RESULT TO WS-OUT
           DISPLAY FUNCTION TRIM(WS-OUT LEADING)
           GOBACK.
