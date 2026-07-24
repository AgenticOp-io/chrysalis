      *> SQLCA COPY resolve fixture — no invented DB2 runtime (D6442).
      *> COPY SQLCA path (HISTLD00-shaped). Dual path: EXEC SQL INCLUDE
      *> SQLCA on batch/SQLINV00.cbl also resolves the same SQLCA.cpy;
      *> EXEC SQL DML/cursor ops remain holes (no DB2 runtime).
       IDENTIFICATION DIVISION.
       PROGRAM-ID. SQLCPY00.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
           COPY SQLCA.
       PROCEDURE DIVISION.
       0000-MAIN.
           MOVE 0 TO SQLCODE
           GOBACK.
