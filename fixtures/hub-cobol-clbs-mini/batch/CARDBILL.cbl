      *> CardDemo bill pipeline: fee + late IF + interest (CICS-free extract).
      *> Upstream bill programs remain CICS/VSAM/COPY holes.
      *> fee 29.00 + late 25.00 + interest 15.44 = 69.44
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CARDBILL.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-CURR-BAL       PIC 9(7)V99 VALUE 1000.00.
       01  WS-FEE-RATE       PIC 9V9(4) VALUE 0.0290.
       01  WS-INT-RATE       PIC 9V9(4) VALUE 0.0150.
       01  WS-DAYS-LATE      PIC 9(3) VALUE 45.
       01  WS-LATE-FEE       PIC 9(5)V99 VALUE 25.00.
       01  WS-FEE            PIC 9(7)V99 VALUE 0.
       01  WS-LATE-AMT       PIC 9(7)V99 VALUE 0.
       01  WS-INTEREST       PIC 9(7)V99 VALUE 0.
       01  WS-TOTAL          PIC 9(7)V99 VALUE 0.
       01  WS-OUT            PIC ZZZZ9.99.
       PROCEDURE DIVISION.
       MAIN.
           COMPUTE WS-FEE ROUNDED = WS-CURR-BAL * WS-FEE-RATE
           IF WS-DAYS-LATE > 30
               MOVE WS-LATE-FEE TO WS-LATE-AMT
           ELSE
               MOVE 0 TO WS-LATE-AMT
           END-IF
           COMPUTE WS-INTEREST ROUNDED =
               (WS-CURR-BAL + WS-FEE) * WS-INT-RATE
           COMPUTE WS-TOTAL ROUNDED =
               WS-FEE + WS-LATE-AMT + WS-INTEREST
           MOVE WS-TOTAL TO WS-OUT
           DISPLAY FUNCTION TRIM(WS-OUT LEADING)
           GOBACK.
