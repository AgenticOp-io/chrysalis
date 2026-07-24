      *> Quoted ENTRY alternate-entry path (GnuCOBOL-runnable).
      *> CALL "ALTPHASE" enters ENTRY 'ALTPHASE' (same program, RECURSIVE).
      *> Primary PROCEDURE would set 10; alternate sets 55.
      *> Nested PROGRAM-ID cannot host ENTRY — D6442 honest cobc shape.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. ENTRYRN IS RECURSIVE.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-PHASE           PIC 99 VALUE 0.
       01  WS-OUT             PIC 99.
       LINKAGE SECTION.
       01  LK-PHASE           PIC 99.
       PROCEDURE DIVISION.
       MAIN.
           CALL "ALTPHASE" USING WS-PHASE
           MOVE WS-PHASE TO WS-OUT
           DISPLAY WS-OUT
           GOBACK.
       ENTRY 'ALTPHASE' USING LK-PHASE.
           MOVE 55 TO LK-PHASE
           GOBACK.
