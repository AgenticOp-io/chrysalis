      *> Additional curated GnuCOBOL probe for az-legacy-engineering.
      *> Upstream BATJSON/BATCHVSAM stay VSAM/JSON holes. This mini lifts
      *> nested IF control-total accumulation (no product UI).
      *> Status A + amount 50 → total 50.00
       IDENTIFICATION DIVISION.
       PROGRAM-ID. AZBATCH.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-STATUS         PIC X VALUE 'A'.
       01  WS-AMOUNT         PIC 9(5)V99 VALUE 50.00.
       01  WS-TOTAL          PIC 9(7)V99 VALUE 0.
       01  WS-OUT            PIC ZZZZ9.99.
       PROCEDURE DIVISION.
       MAIN.
           IF WS-STATUS = 'A'
               IF WS-AMOUNT > 0
                   ADD WS-AMOUNT TO WS-TOTAL
               END-IF
           ELSE
               MOVE 0 TO WS-TOTAL
           END-IF
           MOVE WS-TOTAL TO WS-OUT
           DISPLAY FUNCTION TRIM(WS-OUT LEADING)
           GOBACK.
