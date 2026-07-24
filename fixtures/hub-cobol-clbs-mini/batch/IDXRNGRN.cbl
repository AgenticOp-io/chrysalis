      *> LINE SEQUENTIAL START-from-key range scan — cobc-runnable VSAM START KEY >= substitute.
      *> Distinct from IDXKEYRN (exact key) and IDXUPDRN (key+ADD update).
      *> Parallel to IDXVSAM START; keys >= 42 → sum 25.00+30.00+15.00 = 70.00
       IDENTIFICATION DIVISION.
       PROGRAM-ID. IDXRNGRN.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT DATA-FILE ASSIGN TO "idxrngrn.dat"
               ORGANIZATION IS LINE SEQUENTIAL.
       DATA DIVISION.
       FILE SECTION.
       FD  DATA-FILE.
       01  DATA-REC.
           05  DATA-KEY         PIC 9(4).
           05  DATA-AMT         PIC 9(5)V99.
       WORKING-STORAGE SECTION.
       01  WS-EOF               PIC X VALUE 'N'.
       01  WS-START-KEY         PIC 9(4) VALUE 42.
       01  WS-SUM               PIC 9(7)V99 VALUE 0.
       01  WS-OUT               PIC ZZZZ9.99.
       PROCEDURE DIVISION.
       MAIN.
           OPEN OUTPUT DATA-FILE
           MOVE 10 TO DATA-KEY
           MOVE 12.50 TO DATA-AMT
           WRITE DATA-REC
           MOVE 20 TO DATA-KEY
           MOVE 8.00 TO DATA-AMT
           WRITE DATA-REC
           MOVE 42 TO DATA-KEY
           MOVE 25.00 TO DATA-AMT
           WRITE DATA-REC
           MOVE 55 TO DATA-KEY
           MOVE 30.00 TO DATA-AMT
           WRITE DATA-REC
           MOVE 99 TO DATA-KEY
           MOVE 15.00 TO DATA-AMT
           WRITE DATA-REC
           CLOSE DATA-FILE
           OPEN INPUT DATA-FILE
           PERFORM UNTIL WS-EOF = 'Y'
               READ DATA-FILE
                   AT END
                       MOVE 'Y' TO WS-EOF
                   NOT AT END
                       IF DATA-KEY >= WS-START-KEY
                           ADD DATA-AMT TO WS-SUM
                       END-IF
               END-READ
           END-PERFORM
           CLOSE DATA-FILE
           MOVE WS-SUM TO WS-OUT
           DISPLAY FUNCTION TRIM(WS-OUT LEADING)
           GOBACK.
