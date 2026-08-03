      *> CardDemo CBACT04C monthly-interest COMPUTE extract (GnuCOBOL-runnable).
      *> Upstream CBACT04C is INDEXED/VSAM INTCALC — stays honest hole.
      *> Idiom: (bal * annual-rate) / 1200 → monthly interest.
      *> (1000.00 * 1.5) / 1200 = 1.25
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CBACT04RN.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-CURR-BAL       PIC 9(7)V99 VALUE 1000.00.
       01  WS-INT-RATE       PIC 9(3)V99 VALUE 1.5.
       01  WS-MONTHLY-INT    PIC 9(7)V99 VALUE 0.
       01  WS-OUT            PIC ZZZZ9.99.
       PROCEDURE DIVISION.
       MAIN.
           COMPUTE WS-MONTHLY-INT ROUNDED =
               (WS-CURR-BAL * WS-INT-RATE) / 1200
           MOVE WS-MONTHLY-INT TO WS-OUT
           DISPLAY FUNCTION TRIM(WS-OUT LEADING)
           GOBACK.
