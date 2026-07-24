      *> CLBS RPTSTA00-shaped system statistics report — LINE SEQUENTIAL.
      *> Upstream RPTSTA00 uses INDEXED DB2/batch stats + SEQUENTIAL report + COPY.
      *> This runnable adaptation: seed DB2 + batch elapsed metrics, sum both into
      *> report total, write report lines, display combined metrics (no VSAM/COPY/JCL).
      *> DB2 12.50+18.75+9.00 + Batch 20.00+11.50 = 71.75
       IDENTIFICATION DIVISION.
       PROGRAM-ID. RPTSTARN.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT DB2-STATS ASSIGN TO "rptstarn-db2.dat"
               ORGANIZATION IS LINE SEQUENTIAL.
           SELECT BATCH-STATS ASSIGN TO "rptstarn-bch.dat"
               ORGANIZATION IS LINE SEQUENTIAL.
           SELECT REPORT-FILE ASSIGN TO "rptstarn-rpt.dat"
               ORGANIZATION IS LINE SEQUENTIAL.
       DATA DIVISION.
       FILE SECTION.
       FD  DB2-STATS.
       01  DB2-REC.
           05  DB2-ELAPSED       PIC 9(5)V99.
       FD  BATCH-STATS.
       01  BCH-REC.
           05  BCH-ELAPSED       PIC 9(5)V99.
       FD  REPORT-FILE.
       01  REPORT-RECORD         PIC X(40).
       WORKING-STORAGE SECTION.
       01  WS-EOF                PIC X VALUE 'N'.
       01  WS-DB2-TOTAL          PIC 9(7)V99 VALUE 0.
       01  WS-BCH-TOTAL          PIC 9(7)V99 VALUE 0.
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
           OPEN OUTPUT DB2-STATS
           MOVE 12.50 TO DB2-ELAPSED
           WRITE DB2-REC
           MOVE 18.75 TO DB2-ELAPSED
           WRITE DB2-REC
           MOVE 9.00 TO DB2-ELAPSED
           WRITE DB2-REC
           CLOSE DB2-STATS
           OPEN OUTPUT BATCH-STATS
           MOVE 20.00 TO BCH-ELAPSED
           WRITE BCH-REC
           MOVE 11.50 TO BCH-ELAPSED
           WRITE BCH-REC
           CLOSE BATCH-STATS
           OPEN INPUT DB2-STATS
           OPEN INPUT BATCH-STATS
           MOVE 'N' TO WS-EOF
           MOVE 0 TO WS-DB2-TOTAL
           MOVE 0 TO WS-BCH-TOTAL
           MOVE 0 TO WS-REPORT-TOTAL.
       2000-PROCESS-REPORT.
           PERFORM UNTIL WS-EOF = 'Y'
               READ DB2-STATS
                   AT END
                       MOVE 'Y' TO WS-EOF
                   NOT AT END
                       ADD DB2-ELAPSED TO WS-DB2-TOTAL
               END-READ
           END-PERFORM
           CLOSE DB2-STATS
           MOVE 'N' TO WS-EOF
           PERFORM UNTIL WS-EOF = 'Y'
               READ BATCH-STATS
                   AT END
                       MOVE 'Y' TO WS-EOF
                   NOT AT END
                       ADD BCH-ELAPSED TO WS-BCH-TOTAL
               END-READ
           END-PERFORM
           CLOSE BATCH-STATS
           ADD WS-DB2-TOTAL TO WS-REPORT-TOTAL
           ADD WS-BCH-TOTAL TO WS-REPORT-TOTAL
           OPEN OUTPUT REPORT-FILE
           MOVE "SYSTEM STATISTICS REPORT" TO WS-RPT-LINE
           WRITE REPORT-RECORD FROM WS-RPT-LINE
           MOVE WS-REPORT-TOTAL TO WS-OUT
           MOVE WS-OUT TO WS-RPT-LINE
           WRITE REPORT-RECORD FROM WS-RPT-LINE
           CLOSE REPORT-FILE.
       3000-CLEANUP.
           MOVE WS-REPORT-TOTAL TO WS-OUT
           DISPLAY FUNCTION TRIM(WS-OUT LEADING).
