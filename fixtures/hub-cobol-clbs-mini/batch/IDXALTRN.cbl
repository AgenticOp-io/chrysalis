      *> GnuCOBOL INDEXED + ALTERNATE RECORD KEY probe (BDB) — GCE cobc.
      *> Proves BDB alternate-key READ; still ≠ mainframe VSAM / IDCAMS.
      *> Alt START+REWRITE: IDXALTRW. DELETE: IDXDELRN. Primary START+REWRITE: IDXSTRWR.
      *> Primary-key-only INDEXED probe: IDXPROBE.
      *> Write alt ALT00088 → 88.25; READ KEY IS IDX-ALT-KEY → 88.25
       IDENTIFICATION DIVISION.
       PROGRAM-ID. IDXALTRN.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT IDX-FILE ASSIGN TO "idxaltrn.dat"
               ORGANIZATION IS INDEXED
               ACCESS MODE IS DYNAMIC
               RECORD KEY IS IDX-KEY
               ALTERNATE RECORD KEY IS IDX-ALT-KEY
               FILE STATUS IS WS-FS.
       DATA DIVISION.
       FILE SECTION.
       FD  IDX-FILE.
       01  IDX-REC.
           05  IDX-KEY           PIC 9(4).
           05  IDX-ALT-KEY       PIC X(8).
           05  IDX-AMT           PIC 9(5)V99.
       WORKING-STORAGE SECTION.
       01  WS-FS                 PIC X(2).
       01  WS-FIND-ALT           PIC X(8) VALUE "ALT00088".
       01  WS-OUT                PIC ZZZZ9.99.
       PROCEDURE DIVISION.
       MAIN.
           OPEN OUTPUT IDX-FILE
           MOVE 10 TO IDX-KEY
           MOVE "ALT00010" TO IDX-ALT-KEY
           MOVE 12.50 TO IDX-AMT
           WRITE IDX-REC
               INVALID KEY
                   MOVE "99" TO WS-FS
           END-WRITE
           MOVE 88 TO IDX-KEY
           MOVE "ALT00088" TO IDX-ALT-KEY
           MOVE 88.25 TO IDX-AMT
           WRITE IDX-REC
               INVALID KEY
                   MOVE "99" TO WS-FS
           END-WRITE
           CLOSE IDX-FILE
           OPEN INPUT IDX-FILE
           MOVE WS-FIND-ALT TO IDX-ALT-KEY
           READ IDX-FILE
               KEY IS IDX-ALT-KEY
               INVALID KEY
                   MOVE "23" TO WS-FS
                   MOVE 0 TO IDX-AMT
           END-READ
           MOVE IDX-AMT TO WS-OUT
           DISPLAY FUNCTION TRIM(WS-OUT LEADING)
           CLOSE IDX-FILE
           GOBACK.
