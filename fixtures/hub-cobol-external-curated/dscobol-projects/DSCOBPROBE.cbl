      *> Curated GnuCOBOL probe for dscobol-projects corpus.
      *> Upstream herc03 samples may need MVS macros / fixed-form; those stay
      *> inventory-first. This mini lifts a simple COMPUTE ROUNDED product.
      *> 12.50 * 3.20 = 40.00
       IDENTIFICATION DIVISION.
       PROGRAM-ID. DSCOBPROBE.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-QTY            PIC 9(5)V99 VALUE 12.50.
       01  WS-PRICE          PIC 9(5)V99 VALUE 3.20.
       01  WS-TOTAL          PIC 9(7)V99 VALUE 0.
       01  WS-OUT            PIC ZZZZ9.99.
       PROCEDURE DIVISION.
       MAIN.
           COMPUTE WS-TOTAL ROUNDED = WS-QTY * WS-PRICE
           MOVE WS-TOTAL TO WS-OUT
           DISPLAY FUNCTION TRIM(WS-OUT LEADING)
           GOBACK.
