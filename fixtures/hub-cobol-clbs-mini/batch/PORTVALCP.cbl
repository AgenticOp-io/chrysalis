      *> Structural COPY PORTVAL resolve — no invented portfolio runtime.
      *> Upstream PORTVALD uses COPY PORTVAL; mini copybook under copybook/.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. PORTVALCP.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
           COPY PORTVAL.
       PROCEDURE DIVISION.
       0000-MAIN.
           MOVE VAL-SUCCESS TO VAL-ERROR-CODE
           GOBACK.
