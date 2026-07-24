      *> OMP Course #2 nested IF / multi-branch extract (GnuCOBOL-runnable).
      *> Score 75 → grade band 2 (70-79). Nested IF ELSE, not EVALUATE.
      *> Upstream CBL0006 uses file I/O state checks — this lifts branch idiom only.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. NESTBR.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-SCORE           PIC 9(3) VALUE 75.
       01  WS-GRADE           PIC 9 VALUE 0.
       PROCEDURE DIVISION.
       MAIN.
           IF WS-SCORE >= 90
               MOVE 4 TO WS-GRADE
           ELSE
               IF WS-SCORE >= 80
                   MOVE 3 TO WS-GRADE
               ELSE
                   IF WS-SCORE >= 70
                       MOVE 2 TO WS-GRADE
                   ELSE
                       MOVE 1 TO WS-GRADE
                   END-IF
               END-IF
           END-IF
           DISPLAY WS-GRADE
           GOBACK.
