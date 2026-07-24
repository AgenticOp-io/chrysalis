      *> CLBS RPTPOS00-shaped daily position report — LINE SEQUENTIAL.
      *> Upstream RPTPOS00 uses INDEXED masters + SEQUENTIAL report + COPY.
      *> This runnable adaptation: write/read position values, write report
      *> total line, display portfolio value sum (no VSAM/COPY/JCL).
      *> 125.00 + 200.50 + 80.25 = 405.75
       IDENTIFICATION DIVISION.
       PROGRAM-ID. RPTPOSRN.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT POSITION-MASTER ASSIGN TO "rptposrn-pos.dat"
               ORGANIZATION IS LINE SEQUENTIAL.
           SELECT REPORT-FILE ASSIGN TO "rptposrn-rpt.dat"
               ORGANIZATION IS LINE SEQUENTIAL.
       DATA DIVISION.
       FILE SECTION.
       FD  POSITION-MASTER.
       01  POS-REC.
           05  POS-VALUE         PIC 9(5)V99.
       FD  REPORT-FILE.
       01  REPORT-RECORD         PIC X(40).
       WORKING-STORAGE SECTION.
       01  WS-EOF                PIC X VALUE 'N'.
       01  WS-POS-TOTAL          PIC 9(7)V99 VALUE 0.
       01  WS-OUT                PIC ZZZZ9.99.
       01  WS-RPT-LINE           PIC X(40).
       PROCEDURE DIVISION.
       0000-MAIN.
           PERFORM 1000-INITIALIZE
           PERFORM 2000-PROCESS-REPORT
           PERFORM 3000-CLEANUP
           GOBACK.
       1000-INITIALIZE.
           OPEN OUTPUT POSITION-MASTER
           MOVE 125.00 TO POS-VALUE
           WRITE POS-REC
           MOVE 200.50 TO POS-VALUE
           WRITE POS-REC
           MOVE 80.25 TO POS-VALUE
           WRITE POS-REC
           CLOSE POSITION-MASTER
           OPEN INPUT POSITION-MASTER
           MOVE 'N' TO WS-EOF
           MOVE 0 TO WS-POS-TOTAL.
       2000-PROCESS-REPORT.
           PERFORM UNTIL WS-EOF = 'Y'
               READ POSITION-MASTER
                   AT END
                       MOVE 'Y' TO WS-EOF
                   NOT AT END
                       ADD POS-VALUE TO WS-POS-TOTAL
               END-READ
           END-PERFORM
           CLOSE POSITION-MASTER
           OPEN OUTPUT REPORT-FILE
           MOVE "DAILY POSITION REPORT" TO WS-RPT-LINE
           WRITE REPORT-RECORD FROM WS-RPT-LINE
           MOVE WS-POS-TOTAL TO WS-OUT
           MOVE WS-OUT TO WS-RPT-LINE
           WRITE REPORT-RECORD FROM WS-RPT-LINE
           CLOSE REPORT-FILE.
       3000-CLEANUP.
           MOVE WS-POS-TOTAL TO WS-OUT
           DISPLAY FUNCTION TRIM(WS-OUT LEADING).
