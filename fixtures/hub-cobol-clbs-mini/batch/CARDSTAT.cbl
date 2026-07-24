      *> CardDemo multi-status / multi-rate extract (CICS-free).
      *> Broader than CARDPAY (F/P/M pay-option): status A/D/C × tier rates.
      *> Upstream account-status programs remain CICS/VSAM/COPY holes.
      *> status D → 1000 * 0.0550 = 55.00 + late 25.00 = 80.00
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CARDSTAT.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-STATUS         PIC X VALUE 'D'.
       01  WS-BAL            PIC 9(7)V99 VALUE 1000.00.
       01  WS-RATE-A         PIC 9V9(4) VALUE 0.0200.
       01  WS-RATE-D         PIC 9V9(4) VALUE 0.0550.
       01  WS-RATE-C         PIC 9V9(4) VALUE 0.0000.
       01  WS-DAYS-LATE      PIC 9(3) VALUE 45.
       01  WS-LATE-FEE       PIC 9(5)V99 VALUE 25.00.
       01  WS-FEE            PIC 9(7)V99 VALUE 0.
       01  WS-TOTAL          PIC 9(7)V99 VALUE 0.
       01  WS-OUT            PIC ZZZZ9.99.
       PROCEDURE DIVISION.
       MAIN.
           EVALUATE WS-STATUS
               WHEN 'A'
                   COMPUTE WS-FEE ROUNDED = WS-BAL * WS-RATE-A
               WHEN 'D'
                   COMPUTE WS-FEE ROUNDED = WS-BAL * WS-RATE-D
               WHEN 'C'
                   MOVE 0 TO WS-FEE
               WHEN OTHER
                   MOVE 0 TO WS-FEE
           END-EVALUATE
           IF WS-STATUS = 'D' AND WS-DAYS-LATE > 30
               COMPUTE WS-TOTAL ROUNDED = WS-FEE + WS-LATE-FEE
           ELSE
               MOVE WS-FEE TO WS-TOTAL
           END-IF
           MOVE WS-TOTAL TO WS-OUT
           DISPLAY FUNCTION TRIM(WS-OUT LEADING)
           GOBACK.
