      *> CardDemo fee→interest multi-COMPUTE chain (GnuCOBOL-runnable).
      *> Upstream bill/interest programs are CICS/VSAM/COPY — honest hole.
      *> fee = 1000*0.0290 → 29.00; interest = (1000+29)*0.0150 → 15.44; total 44.44
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CARDFEEIN.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-CURR-BAL       PIC 9(7)V99 VALUE 1000.00.
       01  WS-FEE-RATE       PIC 9V9(4) VALUE 0.0290.
       01  WS-INT-RATE       PIC 9V9(4) VALUE 0.0150.
       01  WS-FEE            PIC 9(7)V99 VALUE 0.
       01  WS-INTEREST       PIC 9(7)V99 VALUE 0.
       01  WS-TOTAL          PIC 9(7)V99 VALUE 0.
       01  WS-OUT            PIC ZZZZ9.99.
       PROCEDURE DIVISION.
       MAIN.
           COMPUTE WS-FEE ROUNDED = WS-CURR-BAL * WS-FEE-RATE
           COMPUTE WS-INTEREST ROUNDED =
               (WS-CURR-BAL + WS-FEE) * WS-INT-RATE
           COMPUTE WS-TOTAL ROUNDED = WS-FEE + WS-INTEREST
           MOVE WS-TOTAL TO WS-OUT
           DISPLAY FUNCTION TRIM(WS-OUT LEADING)
           GOBACK.
