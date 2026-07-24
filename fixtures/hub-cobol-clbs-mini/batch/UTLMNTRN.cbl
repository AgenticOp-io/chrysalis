      *> CLBS UTLMNT00-shaped file-maintenance control extract (VSAM-free).
      *> Upstream UTLMNT00: sequential CONTROL-FILE + EVALUATE CTL-FUNCTION
      *> ARCHIVE/CLEANUP/REORG/ANALYZE + VSAM reorg/archive + COPY RTNCODE.
      *> This runnable adaptation: nested CALL … USING + EVALUATE TRUE on
      *> FUNC-INIT/ARCH/CLEN/REOR/ANYS only (no sequential-file façade, no VSAM).
      *> Driver function 'ARCH' → return code 14.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. UTLMNTRN.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-FUNC            PIC X(4) VALUE 'ARCH'.
           88  FUNC-INIT            VALUE 'INIT'.
           88  FUNC-ARCH            VALUE 'ARCH'.
           88  FUNC-CLEN            VALUE 'CLEN'.
           88  FUNC-REOR            VALUE 'REOR'.
           88  FUNC-ANYS            VALUE 'ANYS'.
       01  WS-RC              PIC 99 VALUE 0.
       01  WS-OUT             PIC 99.
       PROCEDURE DIVISION.
       MAIN.
           CALL "UTLMNTSB" USING WS-FUNC WS-RC
           MOVE WS-RC TO WS-OUT
           DISPLAY WS-OUT
           GOBACK.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. UTLMNTSB.
       DATA DIVISION.
       LINKAGE SECTION.
       01  LK-FUNC            PIC X(4).
           88  FUNC-INIT            VALUE 'INIT'.
           88  FUNC-ARCH            VALUE 'ARCH'.
           88  FUNC-CLEN            VALUE 'CLEN'.
           88  FUNC-REOR            VALUE 'REOR'.
           88  FUNC-ANYS            VALUE 'ANYS'.
       01  LK-RC              PIC 99.
       PROCEDURE DIVISION USING LK-FUNC LK-RC.
       DISP.
           EVALUATE TRUE
               WHEN FUNC-INIT
                   PERFORM PROC-INIT-MAINT
               WHEN FUNC-ARCH
                   PERFORM PROC-ARCHIVE
               WHEN FUNC-CLEN
                   PERFORM PROC-CLEANUP
               WHEN FUNC-REOR
                   PERFORM PROC-REORG
               WHEN FUNC-ANYS
                   PERFORM PROC-ANALYZE
               WHEN OTHER
                   MOVE 99 TO LK-RC
           END-EVALUATE
           GOBACK.
       PROC-INIT-MAINT.
           MOVE 0 TO LK-RC.
       PROC-ARCHIVE.
           MOVE 14 TO LK-RC.
       PROC-CLEANUP.
           MOVE 24 TO LK-RC.
       PROC-REORG.
           MOVE 34 TO LK-RC.
       PROC-ANALYZE.
           MOVE 44 TO LK-RC.
       END PROGRAM UTLMNTSB.
       END PROGRAM UTLMNTRN.
