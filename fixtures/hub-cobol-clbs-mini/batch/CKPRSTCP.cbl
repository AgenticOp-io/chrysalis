      *> Structural COPY CKPRST resolve — no invented checkpoint runtime.
      *> Upstream CKPRST.cbl uses COPY CKPRST; mini copybook under copybook/.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CKPRSTCP.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
           COPY CKPRST.
       PROCEDURE DIVISION.
       0000-MAIN.
           MOVE 'I' TO CK-STATUS
           GOBACK.
