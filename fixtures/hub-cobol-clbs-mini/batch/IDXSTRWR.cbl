      *> GnuCOBOL INDEXED START + REWRITE probe (BDB) — GCE cobc.
      *> Proves BDB START KEY EQUAL + REWRITE; still ≠ mainframe VSAM / IDCAMS.
      *> Primary-key read: IDXPROBE. Alternate-key read: IDXALTRN.
      *> DELETE: IDXDELRN. Alt-key START+REWRITE: IDXALTRW. Full inventory: IDXVSAM.
      *> Write key 42 → 77.50; START/READ; ADD 5.00; REWRITE → display 82.50
       IDENTIFICATION DIVISION.
       PROGRAM-ID. IDXSTRWR.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT IDX-FILE ASSIGN TO "idxstrwr.dat"
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
       01  WS-DELTA              PIC 9(5)V99 VALUE 5.00.
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
           OPEN I-O IDX-FILE
           MOVE WS-FIND-KEY TO IDX-KEY
           START IDX-FILE KEY IS EQUAL TO IDX-KEY
               INVALID KEY
                   MOVE "23" TO WS-FS
           END-START
           READ IDX-FILE
               INVALID KEY
                   MOVE "23" TO WS-FS
                   MOVE 0 TO IDX-AMT
           END-READ
           ADD WS-DELTA TO IDX-AMT
           REWRITE IDX-REC
               INVALID KEY
                   MOVE "99" TO WS-FS
           END-REWRITE
           MOVE IDX-AMT TO WS-OUT
           DISPLAY FUNCTION TRIM(WS-OUT LEADING)
           CLOSE IDX-FILE
           GOBACK.
