      *> CLBS UTLMNT00 LINE SEQUENTIAL control-file façade (distinct from
      *> UTLMNTRN USING-only control extract). Upstream CONTROL-FILE +
      *> EVALUATE CTL-FUNCTION ARCHIVE/CLEANUP/REORG/ANALYZE — no VSAM.
      *> Writes ARCHIVE+CLEANUP+REORG control lines, reads, sums RCs → 72.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. UTLMNTLS.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT CTL-FILE ASSIGN TO "utlmntls.dat"
               ORGANIZATION IS LINE SEQUENTIAL.
       DATA DIVISION.
       FILE SECTION.
       FD  CTL-FILE.
       01  CTL-REC.
           05  CTL-FUNCTION      PIC X(8).
       WORKING-STORAGE SECTION.
       01  WS-EOF                PIC X VALUE 'N'.
       01  WS-RC                 PIC 99 VALUE 0.
       01  WS-SUM                PIC 99 VALUE 0.
       01  WS-OUT                PIC 99.
       01  WS-ARCHIVE            PIC X(8) VALUE 'ARCHIVE'.
       01  WS-CLEANUP            PIC X(8) VALUE 'CLEANUP'.
       01  WS-REORG              PIC X(8) VALUE 'REORG'.
       01  WS-ANALYZE            PIC X(8) VALUE 'ANALYZE'.
       PROCEDURE DIVISION.
       MAIN.
           OPEN OUTPUT CTL-FILE
           MOVE WS-ARCHIVE TO CTL-FUNCTION
           WRITE CTL-REC
           MOVE WS-CLEANUP TO CTL-FUNCTION
           WRITE CTL-REC
           MOVE WS-REORG TO CTL-FUNCTION
           WRITE CTL-REC
           CLOSE CTL-FILE
           OPEN INPUT CTL-FILE
           PERFORM UNTIL WS-EOF = 'Y'
               READ CTL-FILE
                   AT END
                       MOVE 'Y' TO WS-EOF
                   NOT AT END
                       PERFORM APPLY-CTL
               END-READ
           END-PERFORM
           CLOSE CTL-FILE
           MOVE WS-SUM TO WS-OUT
           DISPLAY WS-OUT
           GOBACK.
       APPLY-CTL.
           EVALUATE CTL-FUNCTION
               WHEN WS-ARCHIVE
                   MOVE 14 TO WS-RC
               WHEN WS-CLEANUP
                   MOVE 24 TO WS-RC
               WHEN WS-REORG
                   MOVE 34 TO WS-RC
               WHEN WS-ANALYZE
                   MOVE 44 TO WS-RC
               WHEN OTHER
                   MOVE 99 TO WS-RC
           END-EVALUATE
           ADD WS-RC TO WS-SUM.
