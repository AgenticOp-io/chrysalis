      *> CardDemo pay-option extract: EVALUATE WHEN F/P/M + late IF (CICS-free).
      *> Broader than CARDBILL (fee+late+interest only). Upstream COBIL00C stays CICS hole.
      *> option P → 100.00 + late 25.00 = 125.00
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CARDPAY.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-OPTION         PIC X VALUE 'P'.
       01  WS-BAL            PIC 9(7)V99 VALUE 1000.00.
       01  WS-PCT            PIC 9V9(4) VALUE 0.1000.
       01  WS-MIN-PAY        PIC 9(5)V99 VALUE 50.00.
       01  WS-DAYS-LATE      PIC 9(3) VALUE 45.
       01  WS-LATE-FEE       PIC 9(5)V99 VALUE 25.00.
       01  WS-PAY            PIC 9(7)V99 VALUE 0.
       01  WS-TOTAL          PIC 9(7)V99 VALUE 0.
       01  WS-OUT            PIC ZZZZ9.99.
       PROCEDURE DIVISION.
       MAIN.
           EVALUATE WS-OPTION
               WHEN 'F'
                   MOVE WS-BAL TO WS-PAY
               WHEN 'P'
                   COMPUTE WS-PAY ROUNDED = WS-BAL * WS-PCT
               WHEN 'M'
                   MOVE WS-MIN-PAY TO WS-PAY
               WHEN OTHER
                   MOVE 0 TO WS-PAY
           END-EVALUATE
           IF WS-DAYS-LATE > 30
               COMPUTE WS-TOTAL ROUNDED = WS-PAY + WS-LATE-FEE
           ELSE
               MOVE WS-PAY TO WS-TOTAL
           END-IF
           MOVE WS-TOTAL TO WS-OUT
           DISPLAY FUNCTION TRIM(WS-OUT LEADING)
           GOBACK.
