      *> Multi-WHEN EVALUATE on a subject (not EVALUATE TRUE / 88-level).
      *> Code 2 → fee 25. Complements CKPRSTRN (EVALUATE TRUE entry dispatch).
       IDENTIFICATION DIVISION.
       PROGRAM-ID. EVALMANY.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-CODE           PIC 9 VALUE 2.
       01  WS-FEE            PIC 99 VALUE 0.
       01  WS-OUT            PIC Z9.
       PROCEDURE DIVISION.
       MAIN.
           EVALUATE WS-CODE
               WHEN 1
                   MOVE 10 TO WS-FEE
               WHEN 2
                   MOVE 25 TO WS-FEE
               WHEN 3
                   MOVE 40 TO WS-FEE
               WHEN OTHER
                   MOVE 99 TO WS-FEE
           END-EVALUATE
           MOVE WS-FEE TO WS-OUT
           DISPLAY FUNCTION TRIM(WS-OUT LEADING)
           GOBACK.
