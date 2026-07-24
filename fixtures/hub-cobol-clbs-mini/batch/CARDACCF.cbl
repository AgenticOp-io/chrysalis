      *> CardDemo multi-account fee table extract (CICS-free).
      *> OCCURS account table × status A/D/C rates + late IF + COMPUTE sum.
      *> Upstream COBIL00C / account browse stay CICS/VSAM holes.
      *> A:1000*0.02=20 | D:1000*0.055+25 late=80 | C:0 → total 100.00
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CARDACCF.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-RATE-A             PIC 9V9(4) VALUE 0.0200.
       01  WS-RATE-D             PIC 9V9(4) VALUE 0.0550.
       01  WS-RATE-C             PIC 9V9(4) VALUE 0.0000.
       01  WS-LATE-FEE           PIC 9(5)V99 VALUE 25.00.
       01  WS-I                  PIC 9 VALUE 0.
       01  WS-FEE                PIC 9(7)V99 VALUE 0.
       01  WS-TOTAL              PIC 9(7)V99 VALUE 0.
       01  WS-OUT                PIC ZZZZ9.99.
       01  ACCT-TABLE.
           05  ACCT-ENTRY OCCURS 3 TIMES.
               10  ACCT-STATUS      PIC X.
               10  ACCT-BAL         PIC 9(7)V99.
               10  ACCT-DAYS-LATE   PIC 9(3).
       PROCEDURE DIVISION.
       MAIN.
           MOVE 'A' TO ACCT-STATUS(1)
           MOVE 1000.00 TO ACCT-BAL(1)
           MOVE 0 TO ACCT-DAYS-LATE(1)
           MOVE 'D' TO ACCT-STATUS(2)
           MOVE 1000.00 TO ACCT-BAL(2)
           MOVE 45 TO ACCT-DAYS-LATE(2)
           MOVE 'C' TO ACCT-STATUS(3)
           MOVE 500.00 TO ACCT-BAL(3)
           MOVE 0 TO ACCT-DAYS-LATE(3)
           MOVE 0 TO WS-TOTAL
           PERFORM VARYING WS-I FROM 1 BY 1 UNTIL WS-I > 3
               EVALUATE ACCT-STATUS(WS-I)
                   WHEN 'A'
                       COMPUTE WS-FEE ROUNDED =
                           ACCT-BAL(WS-I) * WS-RATE-A
                   WHEN 'D'
                       COMPUTE WS-FEE ROUNDED =
                           ACCT-BAL(WS-I) * WS-RATE-D
                       IF ACCT-DAYS-LATE(WS-I) > 30
                           COMPUTE WS-FEE ROUNDED =
                               WS-FEE + WS-LATE-FEE
                       END-IF
                   WHEN 'C'
                       MOVE 0 TO WS-FEE
                   WHEN OTHER
                       MOVE 0 TO WS-FEE
               END-EVALUATE
               ADD WS-FEE TO WS-TOTAL
           END-PERFORM
           MOVE WS-TOTAL TO WS-OUT
           DISPLAY FUNCTION TRIM(WS-OUT LEADING)
           GOBACK.
