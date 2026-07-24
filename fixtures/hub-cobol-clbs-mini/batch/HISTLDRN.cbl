      *> CLBS HISTLD00-shaped history load — LINE SEQUENTIAL (no VSAM/DB2).
      *> Upstream HISTLD00 uses INDEXED + EXEC SQL INSERT INTO POSHIST — those
      *> stay honest holes (_upstream/HISTLD00.cbl + batch/SQLINV00.cbl).
      *> This runnable adaptation: write/read history amounts, display load total.
      *> 12.50 + 25.00 + 8.25 = 45.75
       IDENTIFICATION DIVISION.
       PROGRAM-ID. HISTLDRN.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT TRANSACTION-HISTORY ASSIGN TO "histldrn.dat"
               ORGANIZATION IS LINE SEQUENTIAL.
       DATA DIVISION.
       FILE SECTION.
       FD  TRANSACTION-HISTORY.
       01  TH-REC.
           05  TH-AMOUNT         PIC 9(5)V99.
       WORKING-STORAGE SECTION.
       01  WS-EOF                PIC X VALUE 'N'.
       01  WS-RECORDS-READ       PIC 9(5) VALUE 0.
       01  WS-AMOUNT-TOTAL       PIC 9(7)V99 VALUE 0.
       01  WS-OUT                PIC ZZZZ9.99.
       PROCEDURE DIVISION.
       0000-MAIN.
           PERFORM 1000-INITIALIZE
           PERFORM 2000-PROCESS
           PERFORM 3000-TERMINATE
           GOBACK.
       1000-INITIALIZE.
           OPEN OUTPUT TRANSACTION-HISTORY
           MOVE 12.50 TO TH-AMOUNT
           WRITE TH-REC
           MOVE 25.00 TO TH-AMOUNT
           WRITE TH-REC
           MOVE 8.25 TO TH-AMOUNT
           WRITE TH-REC
           CLOSE TRANSACTION-HISTORY
           OPEN INPUT TRANSACTION-HISTORY
           MOVE 'N' TO WS-EOF
           MOVE 0 TO WS-RECORDS-READ
           MOVE 0 TO WS-AMOUNT-TOTAL.
       2000-PROCESS.
           PERFORM UNTIL WS-EOF = 'Y'
               READ TRANSACTION-HISTORY
                   AT END
                       MOVE 'Y' TO WS-EOF
                   NOT AT END
                       ADD 1 TO WS-RECORDS-READ
                       ADD TH-AMOUNT TO WS-AMOUNT-TOTAL
               END-READ
           END-PERFORM.
       3000-TERMINATE.
           CLOSE TRANSACTION-HISTORY
           MOVE WS-AMOUNT-TOTAL TO WS-OUT
           DISPLAY FUNCTION TRIM(WS-OUT LEADING).
