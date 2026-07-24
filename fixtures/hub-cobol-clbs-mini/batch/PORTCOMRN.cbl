      *> PORTCOM-linked portfolio CRUD extract (INDEXED-free, cobc-honest).
      *> Deepens PORTONLN COMMAREA COPY into runnable C/R/U/D via EVALUATE
      *> TRUE on PORT-* 88s. Distinct from PORTMSTRN (COPY-free USING) and
      *> PORTONLN (CICS holes). Requires cobc -I copybook → DISPLAY 120.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. PORTCOMRN.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-COMMAREA.
           COPY PORTCOM.
       01  WS-SUM             PIC 999 VALUE 0.
       01  WS-OUT             PIC 999.
       PROCEDURE DIVISION.
       MAIN.
           MOVE 'CREA' TO PORT-FN
           PERFORM DO-CRUD
           ADD PORT-RC TO WS-SUM
           MOVE 'READ' TO PORT-FN
           PERFORM DO-CRUD
           ADD PORT-RC TO WS-SUM
           MOVE 'UPDT' TO PORT-FN
           PERFORM DO-CRUD
           ADD PORT-RC TO WS-SUM
           MOVE 'DELE' TO PORT-FN
           PERFORM DO-CRUD
           ADD PORT-RC TO WS-SUM
           MOVE WS-SUM TO WS-OUT
           DISPLAY WS-OUT
           GOBACK.
       DO-CRUD.
           EVALUATE TRUE
               WHEN PORT-CREATE
                   MOVE 15 TO PORT-RC
                   MOVE 'CREATED' TO PORT-MSG
               WHEN PORT-READ
                   MOVE 25 TO PORT-RC
                   MOVE 'READ-OK' TO PORT-MSG
               WHEN PORT-UPDATE
                   MOVE 35 TO PORT-RC
                   MOVE 'UPDATED' TO PORT-MSG
               WHEN PORT-DELETE
                   MOVE 45 TO PORT-RC
                   MOVE 'DELETED' TO PORT-MSG
               WHEN OTHER
                   MOVE 99 TO PORT-RC
                   MOVE 'BAD-FN' TO PORT-MSG
           END-EVALUATE.
