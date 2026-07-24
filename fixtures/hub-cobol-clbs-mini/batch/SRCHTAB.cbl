      *> OCCURS + SEARCH keyed lookup extract (GnuCOBOL-runnable).
      *> Idiom from gnucobol-examples banking.cbl country-lengths SEARCH —
      *> reduced to a fixed 4-row rate table (no IBAN / linkage / ANY LENGTH).
      *> Find code 30 → amount 350.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. SRCHTAB.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-RATES.
           05  WS-RATE-ROW OCCURS 4 TIMES
                   INDEXED BY WS-IDX.
               10  WS-CODE       PIC 9(2).
               10  WS-AMOUNT     PIC 9(3).
       01  WS-FIND           PIC 9(2) VALUE 30.
       01  WS-RESULT         PIC 9(3) VALUE 0.
       01  WS-OUT            PIC ZZ9.
       PROCEDURE DIVISION.
       MAIN.
           MOVE 10 TO WS-CODE(1)
           MOVE 100 TO WS-AMOUNT(1)
           MOVE 20 TO WS-CODE(2)
           MOVE 200 TO WS-AMOUNT(2)
           MOVE 30 TO WS-CODE(3)
           MOVE 350 TO WS-AMOUNT(3)
           MOVE 40 TO WS-CODE(4)
           MOVE 400 TO WS-AMOUNT(4)
           SET WS-IDX TO 1
           SEARCH WS-RATE-ROW
               AT END
                   MOVE 0 TO WS-RESULT
               WHEN WS-CODE(WS-IDX) = WS-FIND
                   MOVE WS-AMOUNT(WS-IDX) TO WS-RESULT
           END-SEARCH
           MOVE WS-RESULT TO WS-OUT
           DISPLAY FUNCTION TRIM(WS-OUT LEADING)
           GOBACK.
