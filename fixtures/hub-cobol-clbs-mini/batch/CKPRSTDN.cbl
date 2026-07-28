      *> CKPRST COPY-linked behavioral (uses copybook/CKPRST.cpy).
      *> Distinct from CKPRSTRN (COPY-free entry dispatch) and CKPRSTCP
      *> (structural MOVE-only). Drives CK-STATUS 88-levels I/A/C/F/R →
      *> RC 10/20/30/40/50; DISPLAY sum → 150. Requires cobc -I copybook.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CKPRSTDN.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
           COPY CKPRST.
       01  WS-RC              PIC 99 VALUE 0.
       01  WS-SUM             PIC 999 VALUE 0.
       01  WS-OUT             PIC 999.
       PROCEDURE DIVISION.
       MAIN.
           MOVE 'I' TO CK-STATUS
           PERFORM DO-STATUS
           ADD WS-RC TO WS-SUM
           MOVE 'A' TO CK-STATUS
           PERFORM DO-STATUS
           ADD WS-RC TO WS-SUM
           MOVE 'C' TO CK-STATUS
           PERFORM DO-STATUS
           ADD WS-RC TO WS-SUM
           MOVE 'F' TO CK-STATUS
           PERFORM DO-STATUS
           ADD WS-RC TO WS-SUM
           MOVE 'R' TO CK-STATUS
           PERFORM DO-STATUS
           ADD WS-RC TO WS-SUM
           MOVE WS-SUM TO WS-OUT
           DISPLAY WS-OUT
           GOBACK.
       DO-STATUS.
           EVALUATE TRUE
               WHEN CK-INITIAL
                   MOVE 10 TO WS-RC
               WHEN CK-ACTIVE
                   MOVE 20 TO WS-RC
               WHEN CK-COMPLETE
                   MOVE 30 TO WS-RC
               WHEN CK-FAILED
                   MOVE 40 TO WS-RC
               WHEN CK-RESTARTED
                   MOVE 50 TO WS-RC
               WHEN OTHER
                   MOVE 99 TO WS-RC
           END-EVALUATE.
