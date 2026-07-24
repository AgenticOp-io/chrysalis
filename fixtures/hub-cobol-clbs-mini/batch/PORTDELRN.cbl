      *> CLBS PORTDEL-shaped portfolio-delete extract (INDEXED/COPY-free).
      *> Upstream PORTDEL: sequential delete file → READ INDEXED →
      *> EVALUATE TRUE SUCCESS/NOTFND → DELETE + audit reason 01/02/03.
      *> This runnable adaptation: LINE SEQUENTIAL delete façade — write
      *> closed/transferred/requested reasons, EVALUATE TRUE, sum RCs → 60.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. PORTDELRN.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT DEL-FILE ASSIGN TO "portdelrn.dat"
               ORGANIZATION IS LINE SEQUENTIAL.
       DATA DIVISION.
       FILE SECTION.
       FD  DEL-FILE.
       01  DEL-REC.
           05  DEL-REASON-CODE   PIC X(2).
               88  DEL-CLOSED          VALUE '01'.
               88  DEL-TRANSFERRED     VALUE '02'.
               88  DEL-REQUESTED       VALUE '03'.
       WORKING-STORAGE SECTION.
       01  WS-EOF                PIC X VALUE 'N'.
       01  WS-RC                 PIC 99 VALUE 0.
       01  WS-SUM                PIC 99 VALUE 0.
       01  WS-OUT                PIC 99.
       PROCEDURE DIVISION.
       MAIN.
           OPEN OUTPUT DEL-FILE
           MOVE '01' TO DEL-REASON-CODE
           WRITE DEL-REC
           MOVE '02' TO DEL-REASON-CODE
           WRITE DEL-REC
           MOVE '03' TO DEL-REASON-CODE
           WRITE DEL-REC
           CLOSE DEL-FILE
           OPEN INPUT DEL-FILE
           PERFORM UNTIL WS-EOF = 'Y'
               READ DEL-FILE
                   AT END
                       MOVE 'Y' TO WS-EOF
                   NOT AT END
                       PERFORM APPLY-DELETE
               END-READ
           END-PERFORM
           CLOSE DEL-FILE
           MOVE WS-SUM TO WS-OUT
           DISPLAY WS-OUT
           GOBACK.
       APPLY-DELETE.
           EVALUATE TRUE
               WHEN DEL-CLOSED
                   MOVE 10 TO WS-RC
               WHEN DEL-TRANSFERRED
                   MOVE 20 TO WS-RC
               WHEN DEL-REQUESTED
                   MOVE 30 TO WS-RC
               WHEN OTHER
                   MOVE 99 TO WS-RC
           END-EVALUATE
           ADD WS-RC TO WS-SUM.
