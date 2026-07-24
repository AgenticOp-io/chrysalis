      *> Curated GnuCOBOL probe for az-legacy-engineering corpus.
      *> Upstream AZ Batch (BATCHVSAM / BATJSON) needs VSAM + IBM JSON PARSE —
      *> honest holes under GnuCOBOL 3.x. This mini lifts EVALUATE TRUE dispatch
      *> + COMPUTE control totals without inventing product UI.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. AZPROBE.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-MODE            PIC X VALUE 'A'.
           88  MODE-ACCRUE            VALUE 'A'.
           88  MODE-SETTLE            VALUE 'S'.
           88  MODE-REPORT            VALUE 'R'.
       01  WS-BASE            PIC 9(5)V99 VALUE 200.00.
       01  WS-FACTOR          PIC 9V99 VALUE 1.15.
       01  WS-TOTAL           PIC 9(7)V99 VALUE 0.
       01  WS-OUT             PIC ZZZZ9.99.
       PROCEDURE DIVISION.
       MAIN.
           EVALUATE TRUE
               WHEN MODE-ACCRUE
                   COMPUTE WS-TOTAL ROUNDED = WS-BASE * WS-FACTOR
               WHEN MODE-SETTLE
                   MOVE WS-BASE TO WS-TOTAL
               WHEN MODE-REPORT
                   MOVE 0 TO WS-TOTAL
               WHEN OTHER
                   MOVE 99 TO WS-TOTAL
           END-EVALUATE
           MOVE WS-TOTAL TO WS-OUT
           DISPLAY FUNCTION TRIM(WS-OUT LEADING)
           GOBACK.
