      *> Curated GnuCOBOL probe for cobol-course corpus.
      *> Upstream OMP Course labs often need fixed-form / COPY cwd; those stay
      *> inventory-first. This mini lifts OT weekly gross COMPUTE (EMPPAY idiom).
      *> Hours 45 / rate 10 → OT 1.5 → gross 475.00
       IDENTIFICATION DIVISION.
       PROGRAM-ID. COURSEPROBE.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-HOURS          PIC 9(3)V99 VALUE 45.
       01  WS-RATE           PIC 9(3)V99 VALUE 10.
       01  WS-OT-RATE        PIC 9V99 VALUE 1.5.
       01  WS-GROSS          PIC 9(7)V99 VALUE 0.
       01  WS-OUT            PIC ZZZZ9.99.
       PROCEDURE DIVISION.
       MAIN.
           IF WS-HOURS > 40
               COMPUTE WS-GROSS ROUNDED =
                   (40 * WS-RATE) + ((WS-HOURS - 40) * WS-RATE * WS-OT-RATE)
           ELSE
               COMPUTE WS-GROSS ROUNDED = WS-HOURS * WS-RATE
           END-IF
           MOVE WS-GROSS TO WS-OUT
           DISPLAY FUNCTION TRIM(WS-OUT LEADING)
           GOBACK.
