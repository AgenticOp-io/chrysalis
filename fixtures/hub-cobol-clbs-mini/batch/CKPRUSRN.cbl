      *> CKPRST-shaped PROCEDURE DIVISION USING + CALL (VSAM-free).
      *> Upstream CKPRST needs indexed VSAM + COPY books — honest hole.
      *> Nested subprogram; CALL USING entry 'T' → phase 20.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CKPRUSRN.
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
           CALL "CKPRSTSB" USING WS-ENTRY WS-PHASE
           MOVE WS-PHASE TO WS-OUT
           DISPLAY WS-OUT
           GOBACK.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CKPRSTSB.
       DATA DIVISION.
       LINKAGE SECTION.
       01  LK-ENTRY           PIC X.
           88  ENTRY-POINT-INIT     VALUE 'I'.
           88  ENTRY-POINT-TAKE     VALUE 'T'.
           88  ENTRY-POINT-COMMIT   VALUE 'C'.
           88  ENTRY-POINT-RESTART  VALUE 'R'.
       01  LK-PHASE           PIC 99.
       PROCEDURE DIVISION USING LK-ENTRY LK-PHASE.
       DISP.
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
                   MOVE 99 TO LK-PHASE
           END-EVALUATE
           GOBACK.
       PROC-INIT.
           MOVE 0 TO LK-PHASE.
       PROC-TAKE-CHECKPOINT.
           MOVE 20 TO LK-PHASE.
       PROC-COMMIT-CHECKPOINT.
           MOVE 30 TO LK-PHASE.
       PROC-RESTART.
           MOVE 40 TO LK-PHASE.
       END PROGRAM CKPRSTSB.
       END PROGRAM CKPRUSRN.
