      *> Curated GnuCOBOL probe for rocket-bank (BankDemo) corpus.
      *> Upstream BBANK*/SBANK*/OPENFIL programs are CICS + indexed files —
      *> honest holes under plain GnuCOBOL. This mini lifts a deposit interest
      *> COMPUTE ROUNDED idiom without inventing BankDemo UI or CICS runtime.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. BANKPROBE.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-PRINCIPAL      PIC 9(7)V99 VALUE 500.00.
       01  WS-INT-RATE       PIC 9V9(4) VALUE 0.0410.
       01  WS-INTEREST       PIC 9(7)V99 VALUE 0.
       01  WS-OUT            PIC ZZZZ9.99.
       PROCEDURE DIVISION.
       MAIN.
           COMPUTE WS-INTEREST ROUNDED = WS-PRINCIPAL * WS-INT-RATE
           MOVE WS-INTEREST TO WS-OUT
           DISPLAY FUNCTION TRIM(WS-OUT LEADING)
           GOBACK.
