      *> CLBS POSUPDT-shaped position update — LINE SEQUENTIAL.
      *> Upstream POSUPDT.cbl is an empty stub (0-byte) in CLBS; shape taken from
      *> system-architecture (apply transaction deltas → position / cost basis,
      *> record history). VSAM/DB2 masters stay honest holes.
      *> Runnable adaptation: seed txn deltas, sum into position total, write
      *> history + position, display total. 30.00 + 25.50 + 22.75 = 78.25
       IDENTIFICATION DIVISION.
       PROGRAM-ID. POSUPDRN.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT TXN-FILE ASSIGN TO "posupdrn-txn.dat"
               ORGANIZATION IS LINE SEQUENTIAL.
           SELECT POS-FILE ASSIGN TO "posupdrn-pos.dat"
               ORGANIZATION IS LINE SEQUENTIAL.
           SELECT HIST-FILE ASSIGN TO "posupdrn-hist.dat"
               ORGANIZATION IS LINE SEQUENTIAL.
       DATA DIVISION.
       FILE SECTION.
       FD  TXN-FILE.
       01  TXN-REC.
           05  TXN-AMOUNT        PIC S9(5)V99.
       FD  POS-FILE.
       01  POS-REC.
           05  POS-VALUE         PIC 9(7)V99.
       FD  HIST-FILE.
       01  HIST-REC.
           05  HIST-AMOUNT       PIC S9(5)V99.
       WORKING-STORAGE SECTION.
       01  WS-EOF                PIC X VALUE 'N'.
       01  WS-POS-TOTAL          PIC 9(7)V99 VALUE 0.
       01  WS-OUT                PIC ZZZZ9.99.
       PROCEDURE DIVISION.
       0000-MAIN.
           PERFORM 1000-SEED-TRANSACTIONS
           PERFORM 2000-APPLY-UPDATES
           PERFORM 3000-WRITE-POSITION
           GOBACK.
       1000-SEED-TRANSACTIONS.
           OPEN OUTPUT TXN-FILE
           MOVE 30.00 TO TXN-AMOUNT
           WRITE TXN-REC
           MOVE 25.50 TO TXN-AMOUNT
           WRITE TXN-REC
           MOVE 22.75 TO TXN-AMOUNT
           WRITE TXN-REC
           CLOSE TXN-FILE
           OPEN INPUT TXN-FILE
           MOVE 'N' TO WS-EOF
           MOVE 0 TO WS-POS-TOTAL.
       2000-APPLY-UPDATES.
           OPEN OUTPUT HIST-FILE
           PERFORM UNTIL WS-EOF = 'Y'
               READ TXN-FILE
                   AT END
                       MOVE 'Y' TO WS-EOF
                   NOT AT END
                       ADD TXN-AMOUNT TO WS-POS-TOTAL
                       MOVE TXN-AMOUNT TO HIST-AMOUNT
                       WRITE HIST-REC
               END-READ
           END-PERFORM
           CLOSE TXN-FILE
           CLOSE HIST-FILE.
       3000-WRITE-POSITION.
           OPEN OUTPUT POS-FILE
           MOVE WS-POS-TOTAL TO POS-VALUE
           WRITE POS-REC
           CLOSE POS-FILE
           MOVE WS-POS-TOTAL TO WS-OUT
           DISPLAY FUNCTION TRIM(WS-OUT LEADING).
