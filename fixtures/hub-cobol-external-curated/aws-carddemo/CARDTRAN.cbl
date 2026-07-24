      *> Additional curated GnuCOBOL probe for aws-carddemo (COTRN02-shaped).
      *> Upstream COTRN02C is CICS MAP/VSAM WRITE — stays honest hole.
      *> This mini: transaction-add amount + type fee COMPUTE ROUNDED.
      *> Type '01' purchase → amt 100.00 * 0.025 = 2.50
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CARDTRAN.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-TRN-TYPE       PIC X(2) VALUE '01'.
       01  WS-TRN-AMT        PIC 9(7)V99 VALUE 100.00.
       01  WS-FEE-RATE       PIC 9V9(4) VALUE 0.0250.
       01  WS-FEE            PIC 9(7)V99 VALUE 0.
       01  WS-OUT            PIC ZZZZ9.99.
       PROCEDURE DIVISION.
       MAIN.
           EVALUATE WS-TRN-TYPE
               WHEN '01'
                   COMPUTE WS-FEE ROUNDED = WS-TRN-AMT * WS-FEE-RATE
               WHEN '02'
                   COMPUTE WS-FEE ROUNDED =
                       WS-TRN-AMT * WS-FEE-RATE * 0.5
               WHEN OTHER
                   MOVE 0 TO WS-FEE
           END-EVALUATE
           MOVE WS-FEE TO WS-OUT
           DISPLAY FUNCTION TRIM(WS-OUT LEADING)
           GOBACK.
