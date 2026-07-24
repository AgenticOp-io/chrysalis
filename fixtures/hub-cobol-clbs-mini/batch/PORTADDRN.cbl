      *> CLBS PORTADD-shaped portfolio-add extract (INDEXED/COPY-free).
      *> Upstream PORTADD: sequential input → validate ID/status → WRITE
      *> INDEXED + EVALUATE TRUE on file-status SUCCESS/DUP/OTHER.
      *> This runnable adaptation: LINE SEQUENTIAL input façade — write
      *> three valid (status A) + one invalid, count successful adds → 3.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. PORTADDRN.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT IN-FILE ASSIGN TO "portaddrn.dat"
               ORGANIZATION IS LINE SEQUENTIAL.
       DATA DIVISION.
       FILE SECTION.
       FD  IN-FILE.
       01  IN-REC.
           05  PORT-ID           PIC X(8).
           05  PORT-STATUS       PIC X.
       WORKING-STORAGE SECTION.
       01  WS-EOF                PIC X VALUE 'N'.
       01  WS-ADD-COUNT          PIC 9 VALUE 0.
       01  WS-OUT                PIC 9.
       PROCEDURE DIVISION.
       MAIN.
           OPEN OUTPUT IN-FILE
           MOVE 'PORT0001' TO PORT-ID
           MOVE 'A' TO PORT-STATUS
           WRITE IN-REC
           MOVE 'PORT0002' TO PORT-ID
           MOVE 'A' TO PORT-STATUS
           WRITE IN-REC
           MOVE SPACES TO PORT-ID
           MOVE 'A' TO PORT-STATUS
           WRITE IN-REC
           MOVE 'PORT0003' TO PORT-ID
           MOVE 'A' TO PORT-STATUS
           WRITE IN-REC
           CLOSE IN-FILE
           OPEN INPUT IN-FILE
           PERFORM UNTIL WS-EOF = 'Y'
               READ IN-FILE
                   AT END
                       MOVE 'Y' TO WS-EOF
                   NOT AT END
                       PERFORM VALIDATE-AND-ADD
               END-READ
           END-PERFORM
           CLOSE IN-FILE
           MOVE WS-ADD-COUNT TO WS-OUT
           DISPLAY WS-OUT
           GOBACK.
       VALIDATE-AND-ADD.
           IF PORT-ID EQUAL SPACES OR
              PORT-STATUS NOT EQUAL 'A'
               EXIT PARAGRAPH
           END-IF
           ADD 1 TO WS-ADD-COUNT.
