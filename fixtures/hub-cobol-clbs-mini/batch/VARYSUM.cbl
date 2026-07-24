      *> OMP Course #2 PERFORM VARYING extract (GnuCOBOL-runnable).
      *> Idiom from TOTEN2 / CBL0033 — sum 1..10 via PERFORM VARYING.
      *> Upstream labs need ACCT-REC / PRINT-LINE — honest hole; this lifts loop only.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. VARYSUM.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-COUNTER         PIC 9(2) VALUE 0.
       01  WS-LIMIT           PIC 9(2) VALUE 10.
       01  WS-TOTAL           PIC 9(4) VALUE 0.
       01  WS-OUT             PIC ZZZ9.
       PROCEDURE DIVISION.
       MAIN.
           PERFORM VARYING WS-COUNTER FROM 1 BY 1
               UNTIL WS-COUNTER > WS-LIMIT
               ADD WS-COUNTER TO WS-TOTAL
           END-PERFORM
           MOVE WS-TOTAL TO WS-OUT
           DISPLAY FUNCTION TRIM(WS-OUT LEADING)
           GOBACK.
