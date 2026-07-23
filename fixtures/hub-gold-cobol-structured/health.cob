      *> chrysalis-route: GET /health
      *> chrysalis-return: {"ok":true}
       IDENTIFICATION DIVISION.
       PROGRAM-ID. HEALTH.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-OK    PIC X VALUE "Y".
       PROCEDURE DIVISION.
           MOVE TRUE TO WS-OK
           GOBACK.
