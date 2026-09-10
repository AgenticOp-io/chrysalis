      * Chrysalis labeled extract — COPY REPLACING LEADING (G10124)
      * Pattern: meyfa/CobolCraft (MIT) DD-ENTITY host usage
       IDENTIFICATION DIVISION.
       PROGRAM-ID. COPYLEAD.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  LK-ENTITY.
           COPY DD-ENTITY REPLACING LEADING ==ENTITY== BY ==LK-ENTITY==.
       PROCEDURE DIVISION.
           GOBACK.
