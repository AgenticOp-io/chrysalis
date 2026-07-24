      *> CLBS PORTVALD COPY-linked behavioral (uses copybook/PORTVAL.cpy).
      *> Distinct from PORTVALRN (COPY-free RC 31) and PORTVALCP (structural).
      *> Validates via COPY constants: bad ID → VAL-INVALID-ID (1), zero acct →
      *> VAL-INVALID-ACCT (2), ETF type → VAL-SUCCESS (0), amount in-range →
      *> VAL-SUCCESS (0); DISPLAY sum → 3. Requires cobc -I copybook.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. PORTVALDN.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
           COPY PORTVAL.
       01  WS-FUNC            PIC X(4) VALUE 'VID'.
           88  FUNC-VID             VALUE 'VID'.
           88  FUNC-VACT            VALUE 'VACT'.
           88  FUNC-VTYP            VALUE 'VTYP'.
           88  FUNC-VAMT            VALUE 'VAMT'.
       01  WS-INPUT           PIC X(50).
       01  WS-RC              PIC S9(4) VALUE 0.
       01  WS-SUM             PIC 9 VALUE 0.
       01  WS-OUT             PIC 9.
       PROCEDURE DIVISION.
       MAIN.
           MOVE 'XXXX9999' TO WS-INPUT
           MOVE 'VID' TO WS-FUNC
           PERFORM DO-VALIDATE
           ADD WS-RC TO WS-SUM
           MOVE '0000000000' TO WS-INPUT
           MOVE 'VACT' TO WS-FUNC
           PERFORM DO-VALIDATE
           ADD WS-RC TO WS-SUM
           MOVE 'ETF' TO WS-INPUT
           MOVE 'VTYP' TO WS-FUNC
           PERFORM DO-VALIDATE
           ADD WS-RC TO WS-SUM
           MOVE '100.00' TO WS-INPUT
           MOVE 'VAMT' TO WS-FUNC
           PERFORM DO-VALIDATE
           ADD WS-RC TO WS-SUM
           MOVE WS-SUM TO WS-OUT
           DISPLAY WS-OUT
           GOBACK.
       DO-VALIDATE.
           INITIALIZE VAL-WORK-AREAS
           EVALUATE TRUE
               WHEN FUNC-VID
                   PERFORM VALIDATE-ID
               WHEN FUNC-VACT
                   PERFORM VALIDATE-ACCOUNT
               WHEN FUNC-VTYP
                   PERFORM VALIDATE-TYPE
               WHEN FUNC-VAMT
                   PERFORM VALIDATE-AMOUNT
               WHEN OTHER
                   MOVE VAL-INVALID-ID TO WS-RC
           END-EVALUATE.
       VALIDATE-ID.
           IF WS-INPUT(1:4) NOT = VAL-ID-PREFIX
               MOVE VAL-INVALID-ID TO WS-RC
               EXIT PARAGRAPH
           END-IF
           MOVE WS-INPUT(5:4) TO VAL-NUMERIC-CHECK
           IF VAL-NUMERIC-CHECK IS NOT NUMERIC
               MOVE VAL-INVALID-ID TO WS-RC
               EXIT PARAGRAPH
           END-IF
           MOVE VAL-SUCCESS TO WS-RC.
       VALIDATE-ACCOUNT.
           IF WS-INPUT IS NOT NUMERIC
           OR WS-INPUT = ZEROS
               MOVE VAL-INVALID-ACCT TO WS-RC
               EXIT PARAGRAPH
           END-IF
           MOVE VAL-SUCCESS TO WS-RC.
       VALIDATE-TYPE.
           IF WS-INPUT NOT = 'STK'
              AND NOT = 'BND'
              AND NOT = 'MMF'
              AND NOT = 'ETF'
               MOVE VAL-INVALID-TYPE TO WS-RC
               EXIT PARAGRAPH
           END-IF
           MOVE VAL-SUCCESS TO WS-RC.
       VALIDATE-AMOUNT.
           MOVE WS-INPUT TO VAL-TEMP-NUM
           IF VAL-TEMP-NUM < VAL-MIN-AMOUNT
           OR VAL-TEMP-NUM > VAL-MAX-AMOUNT
               MOVE VAL-INVALID-AMT TO WS-RC
               EXIT PARAGRAPH
           END-IF
           MOVE VAL-SUCCESS TO WS-RC.
