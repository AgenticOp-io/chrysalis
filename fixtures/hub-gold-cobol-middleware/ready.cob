      *> chrysalis-route: GET /ready
      *> chrysalis-return: {"ready":true}
       IDENTIFICATION DIVISION.
       PROGRAM-ID. READY.
       PROCEDURE DIVISION.
           MOVE TRUE TO WS-READY
           GOBACK.
