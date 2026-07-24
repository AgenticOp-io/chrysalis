      *> GnuCOBOL INDEXED START KEY EQUAL + READ PREVIOUS (BDB) — GCE.
      *> Proves BDB START EQUAL + backward PREV; still ≠ VSAM.
      *> Distinct from IDXSTRWR (EQUAL+REWRITE), IDXNLPRN (NOT LESS+PREV loop),
      *> IDXLTPRN (LESS+PREV). START EQUAL 42 → two PREV reads → 25+8 = 33.00.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. IDXEQPRN.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT IDX-FILE ASSIGN TO "idxeqprn.dat"
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
       01  WS-EOF                PIC X VALUE 'N'.
       01  WS-START-KEY          PIC 9(4) VALUE 42.
       01  WS-PREV-LIMIT         PIC 9 VALUE 2.
       01  WS-PREV-COUNT         PIC 9 VALUE 0.
       01  WS-SUM                PIC 9(7)V99 VALUE 0.
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
           MOVE 20 TO IDX-KEY
           MOVE 8.00 TO IDX-AMT
           WRITE IDX-REC
               INVALID KEY
                   MOVE "99" TO WS-FS
           END-WRITE
           MOVE 42 TO IDX-KEY
           MOVE 25.00 TO IDX-AMT
           WRITE IDX-REC
               INVALID KEY
                   MOVE "99" TO WS-FS
           END-WRITE
           MOVE 55 TO IDX-KEY
           MOVE 30.00 TO IDX-AMT
           WRITE IDX-REC
               INVALID KEY
                   MOVE "99" TO WS-FS
           END-WRITE
           MOVE 99 TO IDX-KEY
           MOVE 15.00 TO IDX-AMT
           WRITE IDX-REC
               INVALID KEY
                   MOVE "99" TO WS-FS
           END-WRITE
           CLOSE IDX-FILE
           OPEN INPUT IDX-FILE
           MOVE WS-START-KEY TO IDX-KEY
           START IDX-FILE KEY IS EQUAL TO IDX-KEY
               INVALID KEY
                   MOVE "23" TO WS-FS
                   MOVE 'Y' TO WS-EOF
           END-START
           PERFORM UNTIL WS-EOF = 'Y' OR WS-PREV-COUNT >= WS-PREV-LIMIT
               READ IDX-FILE PREVIOUS
                   AT END
                       MOVE 'Y' TO WS-EOF
                   NOT AT END
                       ADD IDX-AMT TO WS-SUM
                       ADD 1 TO WS-PREV-COUNT
               END-READ
           END-PERFORM
           CLOSE IDX-FILE
           MOVE WS-SUM TO WS-OUT
           DISPLAY FUNCTION TRIM(WS-OUT LEADING)
           GOBACK.
