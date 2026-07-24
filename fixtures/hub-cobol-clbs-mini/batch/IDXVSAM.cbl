      *> Indexed/VSAM-shaped structural fixture — inventory + honest holes.
      *> ORGANIZATION IS INDEXED / RECORD KEY / ALTERNATE RECORD KEY /
      *> ACCESS DYNAMIC / START / READ / REWRITE / DELETE / INVALID KEY.
      *> Mainframe VSAM semantics are not claimed; GnuCOBOL INDEXED ≠ VSAM.
      *> Behavioral GnuCOBOL INDEXED (BDB): IDXPROBE (primary) + IDXALTRN (alt)
      *> + IDXSTRWR (START+REWRITE) + IDXDELRN (DELETE) + IDXALTRW (alt START+
      *> REWRITE) + IDXGTNRN (START > + READ NEXT) + IDXNLPRN (START NOT LESS +
      *> READ PREVIOUS) + IDXEQPRN/IDXEQNRN/IDXNGTRN/IDXNLNRN/IDXLTNRN/IDXNGPRN
      *> START variants. BDB still ≠ mainframe VSAM / IDCAMS / SHAREOPTIONS.
      *> Behavioral parallel substitutes: IDXKEYRN (exact) + IDXUPDRN (update) +
      *> IDXRNGRN (START-from-key range sum).
       IDENTIFICATION DIVISION.
       PROGRAM-ID. IDXVSAM.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT IDX-FILE ASSIGN TO "IDXFILE"
               ORGANIZATION IS INDEXED
               ACCESS MODE IS DYNAMIC
               RECORD KEY IS IDX-KEY
               ALTERNATE RECORD KEY IS IDX-ALT-KEY
               FILE STATUS IS WS-FILE-STATUS.
       DATA DIVISION.
       FILE SECTION.
       FD  IDX-FILE.
       01  IDX-REC.
           05  IDX-KEY          PIC 9(4).
           05  IDX-ALT-KEY      PIC X(8).
           05  IDX-AMT          PIC 9(5)V99.
       WORKING-STORAGE SECTION.
       01  WS-FILE-STATUS       PIC X(2).
       01  WS-FIND-KEY          PIC 9(4) VALUE 42.
       01  WS-OUT               PIC ZZZZ9.99.
       PROCEDURE DIVISION.
       MAIN.
           OPEN I-O IDX-FILE
           MOVE 10 TO IDX-KEY
           MOVE "ALT00010" TO IDX-ALT-KEY
           MOVE 12.50 TO IDX-AMT
           WRITE IDX-REC
               INVALID KEY
                   MOVE "99" TO WS-FILE-STATUS
           END-WRITE
           MOVE 42 TO IDX-KEY
           MOVE "ALT00042" TO IDX-ALT-KEY
           MOVE 77.50 TO IDX-AMT
           WRITE IDX-REC
               INVALID KEY
                   MOVE "99" TO WS-FILE-STATUS
           END-WRITE
           MOVE WS-FIND-KEY TO IDX-KEY
           START IDX-FILE KEY IS EQUAL TO IDX-KEY
               INVALID KEY
                   MOVE "23" TO WS-FILE-STATUS
           END-START
           READ IDX-FILE
               INVALID KEY
                   MOVE "23" TO WS-FILE-STATUS
           END-READ
           MOVE IDX-AMT TO WS-OUT
           ADD 5.00 TO IDX-AMT
           REWRITE IDX-REC
               INVALID KEY
                   MOVE "99" TO WS-FILE-STATUS
           END-REWRITE
           DELETE IDX-FILE RECORD
               INVALID KEY
                   MOVE "23" TO WS-FILE-STATUS
           END-DELETE
           CLOSE IDX-FILE
           DISPLAY FUNCTION TRIM(WS-OUT LEADING)
           GOBACK.
