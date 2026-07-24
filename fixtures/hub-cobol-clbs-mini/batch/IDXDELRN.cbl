      *> GnuCOBOL INDEXED DELETE probe (BDB) — GCE cobc.
      *> Proves BDB DELETE after WRITE; still ≠ mainframe VSAM / IDCAMS.
      *> Primary read: IDXPROBE. Alt-key: IDXALTRN. START+REWRITE: IDXSTRWR.
      *> Write 10→12.50, 42→77.50; DELETE key 10; READ key 42 → display 77.50
       IDENTIFICATION DIVISION.
       PROGRAM-ID. IDXDELRN.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT IDX-FILE ASSIGN TO "idxdelrn.dat"
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
       01  WS-DEL-KEY            PIC 9(4) VALUE 10.
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
           OPEN I-O IDX-FILE
           MOVE WS-DEL-KEY TO IDX-KEY
           DELETE IDX-FILE RECORD
               INVALID KEY
                   MOVE "23" TO WS-FS
           END-DELETE
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
