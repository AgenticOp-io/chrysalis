      *> Hole-honesty fixture — CALL / ACCEPT / DISPLAY of a name stay holes
       IDENTIFICATION DIVISION.
       PROGRAM-ID. LEGACY-CALL.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-MSG    PIC X(20).
       PROCEDURE DIVISION.
           CALL 'SUBPROG'
           ACCEPT WS-MSG
           DISPLAY WS-MSG
           GOBACK.
