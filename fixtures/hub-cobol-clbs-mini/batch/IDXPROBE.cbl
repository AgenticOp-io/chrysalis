      *> GnuCOBOL INDEXED probe (BDB handler) — cobc-runnable on GCE.
      *> NOT mainframe VSAM: no SHAREOPTIONS / IDCAMS claim.
      *> ALTERNATE KEY behavioral probe: IDXALTRN (still ≠ VSAM).
      *> START+REWRITE BDB probe: IDXSTRWR. Full VSAM inventory: IDXVSAM (holes).
      *> Sequential substitutes: IDXKEYRN / IDXUPDRN / IDXRNGRN.
      *> Write key 42 → 77.50; READ KEY EQUAL → display 77.50
       IDENTIFICATION DIVISION.
       PROGRAM-ID. IDXPROBE.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT IDX-FILE ASSIGN TO "idxprobe.dat"
               ORGANIZATION IS INDEXED
               ACCESS MODE IS DYNAMIC
               RECORD KEY IS IDX-KEY
               FILE STATUS IS WS-FS.
       DATA DIVISION.
       FILE SECTION.
       FD  IDX-FILE.
       01  IDX-REC.
           05  IDX-KEY           PIC 9(4).
           05  IDX-AMT           PIC 9(5)V99.
       WORKING-STORAGE SECTION.
       01  WS-FS                 PIC X(2).
       01  WS-FIND-KEY           PIC 9(4) VALUE 42.
       01  WS-OUT                PIC ZZZZ9.99.
       PROCEDURE DIVISION.
       MAIN.
           OPEN OUTPUT IDX-FILE
           MOVE 10 TO IDX-KEY
           MOVE 12.50 TO IDX-AMT
           WRITE IDX-REC
               INVALID KEY
                   MOVE "99" TO WS-FS
           END-WRITE
           MOVE 42 TO IDX-KEY
           MOVE 77.50 TO IDX-AMT
           WRITE IDX-REC
               INVALID KEY
                   MOVE "99" TO WS-FS
           END-WRITE
           CLOSE IDX-FILE
           OPEN INPUT IDX-FILE
           MOVE WS-FIND-KEY TO IDX-KEY
           READ IDX-FILE
               INVALID KEY
                   MOVE "23" TO WS-FS
                   MOVE 0 TO IDX-AMT
           END-READ
           MOVE IDX-AMT TO WS-OUT
           DISPLAY FUNCTION TRIM(WS-OUT LEADING)
           CLOSE IDX-FILE
           GOBACK.
