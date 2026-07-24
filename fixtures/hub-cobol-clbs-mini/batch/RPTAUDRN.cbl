      *> CLBS RPTAUD00-shaped audit report — LINE SEQUENTIAL.
      *> Upstream RPTAUD00 uses INDEXED audit/error logs + SEQUENTIAL report + COPY.
      *> This runnable adaptation: seed audit + error severities, sum both into
      *> report total, write report lines, display combined severity (no VSAM/COPY/JCL).
      *> Audit 20.00+35.50+15.25 + Error 10.00+5.00 = 85.75
       IDENTIFICATION DIVISION.
       PROGRAM-ID. RPTAUDRN.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT AUDIT-FILE ASSIGN TO "rptaurn-aud.dat"
               ORGANIZATION IS LINE SEQUENTIAL.
           SELECT ERROR-FILE ASSIGN TO "rptaurn-err.dat"
               ORGANIZATION IS LINE SEQUENTIAL.
           SELECT REPORT-FILE ASSIGN TO "rptaurn-rpt.dat"
               ORGANIZATION IS LINE SEQUENTIAL.
       DATA DIVISION.
       FILE SECTION.
       FD  AUDIT-FILE.
       01  AUD-REC.
           05  AUD-SEVERITY      PIC 9(5)V99.
       FD  ERROR-FILE.
       01  ERR-REC.
           05  ERR-SEVERITY      PIC 9(5)V99.
       FD  REPORT-FILE.
       01  REPORT-RECORD         PIC X(40).
       WORKING-STORAGE SECTION.
       01  WS-EOF                PIC X VALUE 'N'.
       01  WS-AUD-TOTAL          PIC 9(7)V99 VALUE 0.
       01  WS-ERR-TOTAL          PIC 9(7)V99 VALUE 0.
       01  WS-REPORT-TOTAL       PIC 9(7)V99 VALUE 0.
       01  WS-OUT                PIC ZZZZ9.99.
       01  WS-RPT-LINE           PIC X(40).
       PROCEDURE DIVISION.
       0000-MAIN.
           PERFORM 1000-INITIALIZE
           PERFORM 2000-PROCESS-REPORT
           PERFORM 3000-CLEANUP
           GOBACK.
       1000-INITIALIZE.
           OPEN OUTPUT AUDIT-FILE
           MOVE 20.00 TO AUD-SEVERITY
           WRITE AUD-REC
           MOVE 35.50 TO AUD-SEVERITY
           WRITE AUD-REC
           MOVE 15.25 TO AUD-SEVERITY
           WRITE AUD-REC
           CLOSE AUDIT-FILE
           OPEN OUTPUT ERROR-FILE
           MOVE 10.00 TO ERR-SEVERITY
           WRITE ERR-REC
           MOVE 5.00 TO ERR-SEVERITY
           WRITE ERR-REC
           CLOSE ERROR-FILE
           OPEN INPUT AUDIT-FILE
           OPEN INPUT ERROR-FILE
           MOVE 'N' TO WS-EOF
           MOVE 0 TO WS-AUD-TOTAL
           MOVE 0 TO WS-ERR-TOTAL
           MOVE 0 TO WS-REPORT-TOTAL.
       2000-PROCESS-REPORT.
           PERFORM UNTIL WS-EOF = 'Y'
               READ AUDIT-FILE
                   AT END
                       MOVE 'Y' TO WS-EOF
                   NOT AT END
                       ADD AUD-SEVERITY TO WS-AUD-TOTAL
               END-READ
           END-PERFORM
           CLOSE AUDIT-FILE
           MOVE 'N' TO WS-EOF
           PERFORM UNTIL WS-EOF = 'Y'
               READ ERROR-FILE
                   AT END
                       MOVE 'Y' TO WS-EOF
                   NOT AT END
                       ADD ERR-SEVERITY TO WS-ERR-TOTAL
               END-READ
           END-PERFORM
           CLOSE ERROR-FILE
           ADD WS-AUD-TOTAL TO WS-REPORT-TOTAL
           ADD WS-ERR-TOTAL TO WS-REPORT-TOTAL
           OPEN OUTPUT REPORT-FILE
           MOVE "SYSTEM AUDIT REPORT" TO WS-RPT-LINE
           WRITE REPORT-RECORD FROM WS-RPT-LINE
           MOVE WS-REPORT-TOTAL TO WS-OUT
           MOVE WS-OUT TO WS-RPT-LINE
           WRITE REPORT-RECORD FROM WS-RPT-LINE
           CLOSE REPORT-FILE.
       3000-CLEANUP.
           MOVE WS-REPORT-TOTAL TO WS-OUT
           DISPLAY FUNCTION TRIM(WS-OUT LEADING).
