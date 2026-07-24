      *> CLBS PORTUPDT-shaped portfolio-update extract (INDEXED/COPY-free).
      *> Upstream PORTUPDT: sequential update file → READ INDEXED →
      *> EVALUATE TRUE on UPDT-ACTION STATUS/VALUE/NAME → REWRITE.
      *> This runnable adaptation: LINE SEQUENTIAL update façade — write
      *> S+V+N actions, EVALUATE TRUE, sum action RCs → 63.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. PORTUPDRN.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT UPDT-FILE ASSIGN TO "portupdrn.dat"
               ORGANIZATION IS LINE SEQUENTIAL.
       DATA DIVISION.
       FILE SECTION.
       FD  UPDT-FILE.
       01  UPDT-REC.
           05  UPDT-ACTION       PIC X.
               88  UPDT-STATUS         VALUE 'S'.
               88  UPDT-VALUE          VALUE 'V'.
               88  UPDT-NAME           VALUE 'N'.
       WORKING-STORAGE SECTION.
       01  WS-EOF                PIC X VALUE 'N'.
       01  WS-RC                 PIC 99 VALUE 0.
       01  WS-SUM                PIC 99 VALUE 0.
       01  WS-OUT                PIC 99.
       PROCEDURE DIVISION.
       MAIN.
           OPEN OUTPUT UPDT-FILE
           MOVE 'S' TO UPDT-ACTION
           WRITE UPDT-REC
           MOVE 'V' TO UPDT-ACTION
           WRITE UPDT-REC
           MOVE 'N' TO UPDT-ACTION
           WRITE UPDT-REC
           CLOSE UPDT-FILE
           OPEN INPUT UPDT-FILE
           PERFORM UNTIL WS-EOF = 'Y'
               READ UPDT-FILE
                   AT END
                       MOVE 'Y' TO WS-EOF
                   NOT AT END
                       PERFORM APPLY-UPDT
               END-READ
           END-PERFORM
           CLOSE UPDT-FILE
           MOVE WS-SUM TO WS-OUT
           DISPLAY WS-OUT
           GOBACK.
       APPLY-UPDT.
           EVALUATE TRUE
               WHEN UPDT-STATUS
                   MOVE 11 TO WS-RC
               WHEN UPDT-VALUE
                   MOVE 21 TO WS-RC
               WHEN UPDT-NAME
                   MOVE 31 TO WS-RC
               WHEN OTHER
                   MOVE 99 TO WS-RC
           END-EVALUATE
           ADD WS-RC TO WS-SUM.
