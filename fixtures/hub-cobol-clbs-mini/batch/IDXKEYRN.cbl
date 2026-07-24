      *> LINE SEQUENTIAL key-scan extract — cobc-runnable VSAM substitute.
      *> Parallel to IDXVSAM (INDEXED/RECORD KEY) which stays a structural hole.
      *> Find key 42 → amount 77.50
       IDENTIFICATION DIVISION.
       PROGRAM-ID. IDXKEYRN.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT DATA-FILE ASSIGN TO "idxkeyrn.dat"
               ORGANIZATION IS LINE SEQUENTIAL.
       DATA DIVISION.
       FILE SECTION.
       FD  DATA-FILE.
       01  DATA-REC.
           05  DATA-KEY         PIC 9(4).
           05  DATA-AMT         PIC 9(5)V99.
       WORKING-STORAGE SECTION.
       01  WS-EOF               PIC X VALUE 'N'.
       01  WS-FIND-KEY          PIC 9(4) VALUE 42.
       01  WS-HIT               PIC 9(7)V99 VALUE 0.
       01  WS-OUT               PIC ZZZZ9.99.
       PROCEDURE DIVISION.
       MAIN.
           OPEN OUTPUT DATA-FILE
           MOVE 10 TO DATA-KEY
           MOVE 12.50 TO DATA-AMT
           WRITE DATA-REC
           MOVE 42 TO DATA-KEY
           MOVE 77.50 TO DATA-AMT
           WRITE DATA-REC
           MOVE 99 TO DATA-KEY
           MOVE 1.00 TO DATA-AMT
           WRITE DATA-REC
           CLOSE DATA-FILE
           OPEN INPUT DATA-FILE
           PERFORM UNTIL WS-EOF = 'Y'
               READ DATA-FILE
                   AT END
                       MOVE 'Y' TO WS-EOF
                   NOT AT END
                       IF DATA-KEY = WS-FIND-KEY
                           MOVE DATA-AMT TO WS-HIT
                       END-IF
               END-READ
           END-PERFORM
           CLOSE DATA-FILE
           MOVE WS-HIT TO WS-OUT
           DISPLAY FUNCTION TRIM(WS-OUT LEADING)
           GOBACK.
