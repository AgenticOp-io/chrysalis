      *> LINE SEQUENTIAL write/read max — distinct from SEQSUM (sum).
      *> CLBS-style batch file I/O without VSAM.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. SEQMAX.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT DATA-FILE ASSIGN TO "seqmax.dat"
               ORGANIZATION IS LINE SEQUENTIAL.
       DATA DIVISION.
       FILE SECTION.
       FD  DATA-FILE.
       01  DATA-REC.
           05  DATA-AMT         PIC 9(5)V99.
       WORKING-STORAGE SECTION.
       01  WS-EOF               PIC X VALUE 'N'.
       01  WS-MAX               PIC 9(7)V99 VALUE 0.
       01  WS-OUT               PIC ZZZZ9.99.
       PROCEDURE DIVISION.
       MAIN.
           OPEN OUTPUT DATA-FILE
           MOVE 10.50 TO DATA-AMT
           WRITE DATA-REC
           MOVE 20.25 TO DATA-AMT
           WRITE DATA-REC
           MOVE 5.00 TO DATA-AMT
           WRITE DATA-REC
           MOVE 30.00 TO DATA-AMT
           WRITE DATA-REC
           CLOSE DATA-FILE
           OPEN INPUT DATA-FILE
           PERFORM UNTIL WS-EOF = 'Y'
               READ DATA-FILE
                   AT END
                       MOVE 'Y' TO WS-EOF
                   NOT AT END
                       IF DATA-AMT > WS-MAX
                           MOVE DATA-AMT TO WS-MAX
                       END-IF
               END-READ
           END-PERFORM
           CLOSE DATA-FILE
           MOVE WS-MAX TO WS-OUT
           DISPLAY FUNCTION TRIM(WS-OUT LEADING)
           GOBACK.
