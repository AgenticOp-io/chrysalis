      *> CardDemo bill-fee COMPUTE extract (GnuCOBOL-runnable).
      *> Upstream COBIL00C is CICS/VSAM/COPY — honest hole. This lifts fee idiom only.
      *> 1000.00 * 0.0290 rounded = 29.00
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CARDINTRN.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-CURR-BAL       PIC 9(7)V99 VALUE 1000.00.
       01  WS-FEE-RATE       PIC 9V9(4) VALUE 0.0290.
       01  WS-FEE            PIC 9(7)V99 VALUE 0.
       01  WS-OUT            PIC ZZZZ9.99.
       PROCEDURE DIVISION.
       MAIN.
           COMPUTE WS-FEE ROUNDED = WS-CURR-BAL * WS-FEE-RATE
           MOVE WS-FEE TO WS-OUT
           DISPLAY FUNCTION TRIM(WS-OUT LEADING)
           GOBACK.
