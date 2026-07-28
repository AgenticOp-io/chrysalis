      *> PORTFLIO COPY-linked behavioral (uses copybook/PORTFLIO.cpy).
      *> Distinct from PORTTEST (structural + FUNCTION RANDOM hole).
      *> Client-type 88s I/C/T → 10/20/30 + status 88s A/C/S → 1/2/3;
      *> DISPLAY sum → 66. Requires cobc -I copybook.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. PORTFLIODN.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
           COPY PORTFLIO.
       01  WS-RC              PIC 99 VALUE 0.
       01  WS-SUM             PIC 999 VALUE 0.
       01  WS-OUT             PIC 999.
       PROCEDURE DIVISION.
       MAIN.
           MOVE 'I' TO PORT-CLIENT-TYPE
           PERFORM DO-TYPE
           ADD WS-RC TO WS-SUM
           MOVE 'C' TO PORT-CLIENT-TYPE
           PERFORM DO-TYPE
           ADD WS-RC TO WS-SUM
           MOVE 'T' TO PORT-CLIENT-TYPE
           PERFORM DO-TYPE
           ADD WS-RC TO WS-SUM
           MOVE 'A' TO PORT-STATUS
           PERFORM DO-STATUS
           ADD WS-RC TO WS-SUM
           MOVE 'C' TO PORT-STATUS
           PERFORM DO-STATUS
           ADD WS-RC TO WS-SUM
           MOVE 'S' TO PORT-STATUS
           PERFORM DO-STATUS
           ADD WS-RC TO WS-SUM
           MOVE WS-SUM TO WS-OUT
           DISPLAY WS-OUT
           GOBACK.
       DO-TYPE.
           EVALUATE TRUE
               WHEN PORT-INDIVIDUAL
                   MOVE 10 TO WS-RC
               WHEN PORT-CORPORATE
                   MOVE 20 TO WS-RC
               WHEN PORT-TRUST
                   MOVE 30 TO WS-RC
               WHEN OTHER
                   MOVE 99 TO WS-RC
           END-EVALUATE.
       DO-STATUS.
           EVALUATE TRUE
               WHEN PORT-ACTIVE
                   MOVE 1 TO WS-RC
               WHEN PORT-CLOSED
                   MOVE 2 TO WS-RC
               WHEN PORT-SUSPENDED
                   MOVE 3 TO WS-RC
               WHEN OTHER
                   MOVE 99 TO WS-RC
           END-EVALUATE.
