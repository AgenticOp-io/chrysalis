      *> Curated GnuCOBOL probe for aws-carddemo corpus.
      *> Upstream CardDemo is CICS/VSAM/COPY-heavy (COBIL00C, COCRDLIC, CBEXPORT…).
      *> Those remain honest holes under GnuCOBOL. This mini lifts bill-fee
      *> COMPUTE with card-status EVALUATE WHEN + late IF (no product UI).
      *> Active + not late → fee 29.00
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CARDPROBE.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-STATUS         PIC X VALUE 'A'.
       01  WS-CURR-BAL       PIC 9(7)V99 VALUE 1000.00.
       01  WS-FEE-RATE       PIC 9V9(4) VALUE 0.0290.
       01  WS-DAYS-LATE      PIC 9(3) VALUE 0.
       01  WS-LATE-FEE       PIC 9(5)V99 VALUE 25.00.
       01  WS-FEE            PIC 9(7)V99 VALUE 0.
       01  WS-TOTAL          PIC 9(7)V99 VALUE 0.
       01  WS-OUT            PIC ZZZZ9.99.
       PROCEDURE DIVISION.
       MAIN.
           EVALUATE WS-STATUS
               WHEN 'A'
                   COMPUTE WS-FEE ROUNDED = WS-CURR-BAL * WS-FEE-RATE
               WHEN 'D'
                   COMPUTE WS-FEE ROUNDED =
                       WS-CURR-BAL * WS-FEE-RATE * 1.5
               WHEN OTHER
                   MOVE 0 TO WS-FEE
           END-EVALUATE
           IF WS-DAYS-LATE > 30
               COMPUTE WS-TOTAL ROUNDED = WS-FEE + WS-LATE-FEE
           ELSE
               MOVE WS-FEE TO WS-TOTAL
           END-IF
           MOVE WS-TOTAL TO WS-OUT
           DISPLAY FUNCTION TRIM(WS-OUT LEADING)
           GOBACK.
