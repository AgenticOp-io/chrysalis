      *> CLBS PORTREAD-shaped portfolio-read extract (INDEXED/COPY-free).
      *> Upstream PORTREAD: OPEN INDEXED → READ NEXT until EOF → count.
      *> This runnable adaptation: LINE SEQUENTIAL façade — write four
      *> portfolio rows, READ NEXT-shaped loop, display record count → 4.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. PORTREADRN.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT PORT-FILE ASSIGN TO "portreadrn.dat"
               ORGANIZATION IS LINE SEQUENTIAL.
       DATA DIVISION.
       FILE SECTION.
       FD  PORT-FILE.
       01  PORT-REC.
           05  PORT-ID           PIC X(8).
           05  PORT-STATUS       PIC X.
       WORKING-STORAGE SECTION.
       01  WS-EOF                PIC X VALUE 'N'.
       01  WS-RECORD-COUNT       PIC 9 VALUE 0.
       01  WS-OUT                PIC 9.
       PROCEDURE DIVISION.
       MAIN.
           OPEN OUTPUT PORT-FILE
           MOVE 'PORT0001' TO PORT-ID
           MOVE 'A' TO PORT-STATUS
           WRITE PORT-REC
           MOVE 'PORT0002' TO PORT-ID
           MOVE 'A' TO PORT-STATUS
           WRITE PORT-REC
           MOVE 'PORT0003' TO PORT-ID
           MOVE 'S' TO PORT-STATUS
           WRITE PORT-REC
           MOVE 'PORT0004' TO PORT-ID
           MOVE 'A' TO PORT-STATUS
           WRITE PORT-REC
           CLOSE PORT-FILE
           OPEN INPUT PORT-FILE
           PERFORM UNTIL WS-EOF = 'Y'
               READ PORT-FILE
                   AT END
                       MOVE 'Y' TO WS-EOF
                   NOT AT END
                       ADD 1 TO WS-RECORD-COUNT
               END-READ
           END-PERFORM
           CLOSE PORT-FILE
           MOVE WS-RECORD-COUNT TO WS-OUT
           DISPLAY WS-OUT
           GOBACK.
