      *> CLBS TSTGEN00-shaped test-data generator extract (file-free of
      *> PORTFLIO/TRNREC/RTNCODE COPYs). Upstream: sequential TEST-CONFIG
      *> + EVALUATE CFG-TEST-TYPE PORTFOLIO/TRANSACTN/ERROR/VOLUME.
      *> This runnable adaptation: LINE SEQUENTIAL config façade — write
      *> PORTFOLIO+TRANSACTN+VOLUME, read, sum type RCs → 76.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. TSTGENRN.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT CFG-FILE ASSIGN TO "tstgenrn.dat"
               ORGANIZATION IS LINE SEQUENTIAL.
       DATA DIVISION.
       FILE SECTION.
       FD  CFG-FILE.
       01  CFG-REC.
           05  CFG-TEST-TYPE     PIC X(10).
       WORKING-STORAGE SECTION.
       01  WS-EOF                PIC X VALUE 'N'.
       01  WS-RC                 PIC 99 VALUE 0.
       01  WS-SUM                PIC 99 VALUE 0.
       01  WS-OUT                PIC 99.
       01  WS-PORTFOLIO          PIC X(10) VALUE 'PORTFOLIO'.
       01  WS-TRANSACTION        PIC X(10) VALUE 'TRANSACTN'.
       01  WS-ERROR-TEST         PIC X(10) VALUE 'ERROR'.
       01  WS-VOLUME-TEST        PIC X(10) VALUE 'VOLUME'.
       PROCEDURE DIVISION.
       MAIN.
           OPEN OUTPUT CFG-FILE
           MOVE WS-PORTFOLIO TO CFG-TEST-TYPE
           WRITE CFG-REC
           MOVE WS-TRANSACTION TO CFG-TEST-TYPE
           WRITE CFG-REC
           MOVE WS-VOLUME-TEST TO CFG-TEST-TYPE
           WRITE CFG-REC
           CLOSE CFG-FILE
           OPEN INPUT CFG-FILE
           PERFORM UNTIL WS-EOF = 'Y'
               READ CFG-FILE
                   AT END
                       MOVE 'Y' TO WS-EOF
                   NOT AT END
                       PERFORM APPLY-CFG
               END-READ
           END-PERFORM
           CLOSE CFG-FILE
           MOVE WS-SUM TO WS-OUT
           DISPLAY WS-OUT
           GOBACK.
       APPLY-CFG.
           EVALUATE CFG-TEST-TYPE
               WHEN WS-PORTFOLIO
                   MOVE 12 TO WS-RC
               WHEN WS-TRANSACTION
                   MOVE 22 TO WS-RC
               WHEN WS-ERROR-TEST
                   MOVE 32 TO WS-RC
               WHEN WS-VOLUME-TEST
                   MOVE 42 TO WS-RC
               WHEN OTHER
                   MOVE 99 TO WS-RC
           END-EVALUATE
           ADD WS-RC TO WS-SUM.
