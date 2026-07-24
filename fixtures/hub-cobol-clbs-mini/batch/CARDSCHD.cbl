      *> CardDemo multi-tran fee schedule extract (CICS-free).
      *> OCCURS fee schedule (P/C/F rates) × OCCURS transactions + SEARCH
      *> rate lookup + COMPUTE ROUNDED fee sum.
      *> Upstream COBIL00C / schedule browse stay CICS/VSAM holes.
      *> P:800*0.02=16 | C:400*0.035=14 | P:200*0.02=4 | F:100*0.05=5 → 39.00
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CARDSCHD.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-I                  PIC 9 VALUE 0.
       01  WS-RATE               PIC 9V9(4) VALUE 0.
       01  WS-FEE                PIC 9(7)V99 VALUE 0.
       01  WS-TOTAL              PIC 9(7)V99 VALUE 0.
       01  WS-OUT                PIC ZZZZ9.99.
       01  FEE-SCHEDULE.
           05  FS-ENTRY OCCURS 3 TIMES INDEXED BY FS-IDX.
               10  FS-CODE          PIC X.
               10  FS-RATE          PIC 9V9(4).
       01  TX-TABLE.
           05  TX-ENTRY OCCURS 4 TIMES.
               10  TX-CODE          PIC X.
               10  TX-AMT           PIC 9(7)V99.
       PROCEDURE DIVISION.
       MAIN.
           MOVE 'P' TO FS-CODE(1)
           MOVE 0.0200 TO FS-RATE(1)
           MOVE 'C' TO FS-CODE(2)
           MOVE 0.0350 TO FS-RATE(2)
           MOVE 'F' TO FS-CODE(3)
           MOVE 0.0500 TO FS-RATE(3)
           MOVE 'P' TO TX-CODE(1)
           MOVE 800.00 TO TX-AMT(1)
           MOVE 'C' TO TX-CODE(2)
           MOVE 400.00 TO TX-AMT(2)
           MOVE 'P' TO TX-CODE(3)
           MOVE 200.00 TO TX-AMT(3)
           MOVE 'F' TO TX-CODE(4)
           MOVE 100.00 TO TX-AMT(4)
           MOVE 0 TO WS-TOTAL
           PERFORM VARYING WS-I FROM 1 BY 1 UNTIL WS-I > 4
               MOVE 0 TO WS-RATE
               SET FS-IDX TO 1
               SEARCH FS-ENTRY
                   AT END
                       MOVE 0 TO WS-RATE
                   WHEN FS-CODE(FS-IDX) = TX-CODE(WS-I)
                       MOVE FS-RATE(FS-IDX) TO WS-RATE
               END-SEARCH
               COMPUTE WS-FEE ROUNDED = TX-AMT(WS-I) * WS-RATE
               ADD WS-FEE TO WS-TOTAL
           END-PERFORM
           MOVE WS-TOTAL TO WS-OUT
           DISPLAY FUNCTION TRIM(WS-OUT LEADING)
           GOBACK.
