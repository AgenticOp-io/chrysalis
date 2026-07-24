      *> CLBS RTNANA00-shaped return-code analysis — LINE SEQUENTIAL.
      *> Upstream RTNANA00: DB2 cursor over RTNCODES (S/W/E/F) + SEQUENTIAL report.
      *> This runnable adaptation: seed status-weight metrics
      *> (S=1.25 W=2.50 E=5.00 F=10.00), sum into analysis total, write report
      *> (no DB2/COPY/INDEXED). 3S+2W+1E+1F → 23.75
       IDENTIFICATION DIVISION.
       PROGRAM-ID. RTNANARN.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT RC-FILE ASSIGN TO "rtnanarn-rc.dat"
               ORGANIZATION IS LINE SEQUENTIAL.
           SELECT REPORT-FILE ASSIGN TO "rtnanarn-rpt.dat"
               ORGANIZATION IS LINE SEQUENTIAL.
       DATA DIVISION.
       FILE SECTION.
       FD  RC-FILE.
       01  RC-REC.
           05  RC-WEIGHT         PIC 9(5)V99.
       FD  REPORT-FILE.
       01  REPORT-RECORD         PIC X(40).
       WORKING-STORAGE SECTION.
       01  WS-EOF                PIC X VALUE 'N'.
       01  WS-ANALYSIS-TOTAL     PIC 9(7)V99 VALUE 0.
       01  WS-OUT                PIC ZZZZ9.99.
       01  WS-RPT-LINE           PIC X(40).
       PROCEDURE DIVISION.
       0000-MAIN.
           PERFORM P100-INIT-PROGRAM
           PERFORM P200-PROCESS-ANALYSIS
           PERFORM P300-GENERATE-REPORT
           PERFORM P900-CLOSE-FILES
           GOBACK.
       P100-INIT-PROGRAM.
           OPEN OUTPUT RC-FILE
           MOVE 1.25 TO RC-WEIGHT
           WRITE RC-REC
           MOVE 1.25 TO RC-WEIGHT
           WRITE RC-REC
           MOVE 1.25 TO RC-WEIGHT
           WRITE RC-REC
           MOVE 2.50 TO RC-WEIGHT
           WRITE RC-REC
           MOVE 2.50 TO RC-WEIGHT
           WRITE RC-REC
           MOVE 5.00 TO RC-WEIGHT
           WRITE RC-REC
           MOVE 10.00 TO RC-WEIGHT
           WRITE RC-REC
           CLOSE RC-FILE
           OPEN INPUT RC-FILE
           MOVE 'N' TO WS-EOF
           MOVE 0 TO WS-ANALYSIS-TOTAL.
       P200-PROCESS-ANALYSIS.
           PERFORM UNTIL WS-EOF = 'Y'
               READ RC-FILE
                   AT END
                       MOVE 'Y' TO WS-EOF
                   NOT AT END
                       ADD RC-WEIGHT TO WS-ANALYSIS-TOTAL
               END-READ
           END-PERFORM
           CLOSE RC-FILE.
       P300-GENERATE-REPORT.
           OPEN OUTPUT REPORT-FILE
           MOVE "RETURN CODE ANALYSIS REPORT" TO WS-RPT-LINE
           WRITE REPORT-RECORD FROM WS-RPT-LINE
           MOVE WS-ANALYSIS-TOTAL TO WS-OUT
           MOVE WS-OUT TO WS-RPT-LINE
           WRITE REPORT-RECORD FROM WS-RPT-LINE
           CLOSE REPORT-FILE
           MOVE WS-ANALYSIS-TOTAL TO WS-OUT
           DISPLAY FUNCTION TRIM(WS-OUT LEADING).
       P900-CLOSE-FILES.
           CONTINUE.
