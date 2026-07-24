      *> Runnable extract of CLBS CKPRST control flow (PROGRAM-ID. CKPRST).
      *> Upstream: COBOL-Legacy-Benchmark-Suite src/programs/batch/CKPRST.cbl
      *> No VSAM/COPY — GnuCOBOL parallel subject. Entry 'T' → TAKE path code 20.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CKPRSTRN.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-ENTRY           PIC X VALUE 'T'.
           88  ENTRY-POINT-INIT     VALUE 'I'.
           88  ENTRY-POINT-TAKE     VALUE 'T'.
           88  ENTRY-POINT-COMMIT   VALUE 'C'.
           88  ENTRY-POINT-RESTART  VALUE 'R'.
       01  WS-PHASE           PIC 99 VALUE 0.
       01  WS-OUT             PIC 99.
       PROCEDURE DIVISION.
       MAIN.
           EVALUATE TRUE
               WHEN ENTRY-POINT-INIT
                   PERFORM PROC-INIT
               WHEN ENTRY-POINT-TAKE
                   PERFORM PROC-TAKE-CHECKPOINT
               WHEN ENTRY-POINT-COMMIT
                   PERFORM PROC-COMMIT-CHECKPOINT
               WHEN ENTRY-POINT-RESTART
                   PERFORM PROC-RESTART
               WHEN OTHER
                   MOVE 99 TO WS-PHASE
           END-EVALUATE
           MOVE WS-PHASE TO WS-OUT
           DISPLAY WS-OUT
           GOBACK.
       PROC-INIT.
           MOVE 0 TO WS-PHASE.
       PROC-TAKE-CHECKPOINT.
           MOVE 20 TO WS-PHASE.
       PROC-COMMIT-CHECKPOINT.
           MOVE 30 TO WS-PHASE.
       PROC-RESTART.
           MOVE 40 TO WS-PHASE.
