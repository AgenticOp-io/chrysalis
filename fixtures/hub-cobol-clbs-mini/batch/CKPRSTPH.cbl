      *> CKPRST phase COPY-linked behavioral (uses copybook/CKPRST.cpy).
      *> Distinct from CKPRSTDN (status 88s) and CKPRSTRN (COPY-free).
      *> Drives CK-PHASE 88s 00/10/20/30/40 → RC 0/10/20/30/40;
      *> DISPLAY sum → 100. Requires cobc -I copybook.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CKPRSTPH.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
           COPY CKPRST.
       01  WS-RC              PIC 99 VALUE 0.
       01  WS-SUM             PIC 999 VALUE 0.
       01  WS-OUT             PIC 999.
       PROCEDURE DIVISION.
       MAIN.
           MOVE '00' TO CK-PHASE
           PERFORM DO-PHASE
           ADD WS-RC TO WS-SUM
           MOVE '10' TO CK-PHASE
           PERFORM DO-PHASE
           ADD WS-RC TO WS-SUM
           MOVE '20' TO CK-PHASE
           PERFORM DO-PHASE
           ADD WS-RC TO WS-SUM
           MOVE '30' TO CK-PHASE
           PERFORM DO-PHASE
           ADD WS-RC TO WS-SUM
           MOVE '40' TO CK-PHASE
           PERFORM DO-PHASE
           ADD WS-RC TO WS-SUM
           MOVE WS-SUM TO WS-OUT
           DISPLAY WS-OUT
           GOBACK.
       DO-PHASE.
           EVALUATE TRUE
               WHEN CK-PHASE-INIT
                   MOVE 0 TO WS-RC
               WHEN CK-PHASE-READ
                   MOVE 10 TO WS-RC
               WHEN CK-PHASE-PROC
                   MOVE 20 TO WS-RC
               WHEN CK-PHASE-UPDT
                   MOVE 30 TO WS-RC
               WHEN CK-PHASE-TERM
                   MOVE 40 TO WS-RC
               WHEN OTHER
                   MOVE 99 TO WS-RC
           END-EVALUATE.
