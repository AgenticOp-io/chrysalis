      *> ERRHAND COPY-linked behavioral (uses copybook/ERRHAND.cpy).
      *> Distinct from PORTTEST (structural RANDOM-hole program stays untouched).
      *> Sum ERR-SUCCESS/WARNING/ERROR/SEVERE/TERMINAL → 0+4+8+12+16 = 40.
      *> Requires cobc -I copybook.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. ERRHANDDN.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
           COPY ERRHAND.
       01  WS-RC              PIC S9(4) VALUE 0.
       01  WS-SUM             PIC 999 VALUE 0.
       01  WS-OUT             PIC 999.
       PROCEDURE DIVISION.
       MAIN.
           MOVE ERR-SUCCESS TO WS-RC
           ADD WS-RC TO WS-SUM
           MOVE ERR-WARNING TO WS-RC
           ADD WS-RC TO WS-SUM
           MOVE ERR-ERROR TO WS-RC
           ADD WS-RC TO WS-SUM
           MOVE ERR-SEVERE TO WS-RC
           ADD WS-RC TO WS-SUM
           MOVE ERR-TERMINAL TO WS-RC
           ADD WS-RC TO WS-SUM
           MOVE WS-SUM TO WS-OUT
           DISPLAY WS-OUT
           GOBACK.
