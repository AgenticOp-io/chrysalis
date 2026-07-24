      *> CLBS PORTTRAN-shaped transaction extract (INDEXED/COPY-free).
      *> Upstream PORTTRAN: sequential txs → EVALUATE TRN-TYPE BU/SL/TR/FE
      *> (+ INDEXED portfolio READ/REWRITE — left as hole on full upstream).
      *> This runnable adaptation: LINE SEQUENTIAL façade — write BU+SL+TR+FE,
      *> EVALUATE subject (not EVALUATE TRUE), sum type RCs → 104.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. PORTTRANRN.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT TRAN-FILE ASSIGN TO "porttranrn.dat"
               ORGANIZATION IS LINE SEQUENTIAL.
       DATA DIVISION.
       FILE SECTION.
       FD  TRAN-FILE.
       01  TRAN-REC.
           05  TRN-TYPE          PIC X(2).
       WORKING-STORAGE SECTION.
       01  WS-EOF                PIC X VALUE 'N'.
       01  WS-RC                 PIC 999 VALUE 0.
       01  WS-SUM                PIC 999 VALUE 0.
       01  WS-OUT                PIC 999.
       PROCEDURE DIVISION.
       MAIN.
           OPEN OUTPUT TRAN-FILE
           MOVE 'BU' TO TRN-TYPE
           WRITE TRAN-REC
           MOVE 'SL' TO TRN-TYPE
           WRITE TRAN-REC
           MOVE 'TR' TO TRN-TYPE
           WRITE TRAN-REC
           MOVE 'FE' TO TRN-TYPE
           WRITE TRAN-REC
           CLOSE TRAN-FILE
           OPEN INPUT TRAN-FILE
           PERFORM UNTIL WS-EOF = 'Y'
               READ TRAN-FILE
                   AT END
                       MOVE 'Y' TO WS-EOF
                   NOT AT END
                       PERFORM APPLY-TRAN
               END-READ
           END-PERFORM
           CLOSE TRAN-FILE
           MOVE WS-SUM TO WS-OUT
           DISPLAY WS-OUT
           GOBACK.
       APPLY-TRAN.
           EVALUATE TRN-TYPE
               WHEN 'BU'
                   MOVE 11 TO WS-RC
               WHEN 'SL'
                   MOVE 21 TO WS-RC
               WHEN 'TR'
                   MOVE 31 TO WS-RC
               WHEN 'FE'
                   MOVE 41 TO WS-RC
               WHEN OTHER
                   MOVE 99 TO WS-RC
           END-EVALUATE
           ADD WS-RC TO WS-SUM.
