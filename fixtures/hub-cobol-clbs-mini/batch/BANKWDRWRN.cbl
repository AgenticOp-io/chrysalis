      *> Rocket-bank withdrawal COMPUTE extract (GnuCOBOL-runnable).
      *> Upstream BBANK*/OPENFIL CICS stay honest holes.
      *> Bal 200.00 - withdraw 45.00 = 155.00
       IDENTIFICATION DIVISION.
       PROGRAM-ID. BANKWDRWRN.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-BAL            PIC 9(7)V99 VALUE 200.00.
       01  WS-WDRW           PIC 9(7)V99 VALUE 45.00.
       01  WS-REMAIN         PIC 9(7)V99 VALUE 0.
       01  WS-OUT            PIC ZZZZ9.99.
       PROCEDURE DIVISION.
       MAIN.
           IF WS-WDRW <= WS-BAL
               COMPUTE WS-REMAIN ROUNDED = WS-BAL - WS-WDRW
           ELSE
               MOVE WS-BAL TO WS-REMAIN
           END-IF
           MOVE WS-REMAIN TO WS-OUT
           DISPLAY FUNCTION TRIM(WS-OUT LEADING)
           GOBACK.
