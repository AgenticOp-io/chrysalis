      ******************************************************************
      * CardDemo CSUTLDTC-shaped structural probe (date validate util).
      * Upstream: aws-carddemo app/cbl/CSUTLDTC.cbl — LINKAGE USING date/
      * format/result + CALL "CEEDAYS" + EVALUATE TRUE on feedback.
      * CORPT00C CALLs this; call stays honest hole (no LE CEEDAYS façade).
      * Not behavioral (D6442/D6447).
      ******************************************************************
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CSUTLDTC.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-DATE-TO-TEST.
           05  VSTRING-LENGTH        PIC S9(4) BINARY.
           05  VSTRING-TEXT          PIC X(10).
       01  WS-DATE-FORMAT.
           05  VSTRING-LENGTH        PIC S9(4) BINARY.
           05  VSTRING-TEXT          PIC X(10).
       01  OUTPUT-LILLIAN            PIC S9(9) BINARY.
       01  WS-MESSAGE.
           05  WS-SEVERITY           PIC X(04).
           05  WS-SEVERITY-N REDEFINES WS-SEVERITY PIC 9(4).
           05  FILLER                PIC X(11) VALUE 'Mesg Code:'.
           05  WS-MSG-NO             PIC X(04).
           05  WS-MSG-NO-N REDEFINES WS-MSG-NO PIC 9(4).
           05  FILLER                PIC X(01) VALUE SPACE.
           05  WS-RESULT             PIC X(15).
       01  FEEDBACK-CODE.
           05  FEEDBACK-TOKEN-VALUE.
               88  FC-INVALID-DATE   VALUE X'0000000000000000'.
               88  FC-BAD-DATE-VALUE VALUE X'000309CC59C3C5C5'.
               10  CASE-1-CONDITION-ID.
                   15  SEVERITY      PIC S9(4) BINARY.
                   15  MSG-NO        PIC S9(4) BINARY.
               10  CASE-SEV-CTL      PIC X.
               10  FACILITY-ID       PIC XXX.
           05  I-S-INFO              PIC S9(9) BINARY.
       LINKAGE SECTION.
       01  LS-DATE                   PIC X(10).
       01  LS-DATE-FORMAT            PIC X(10).
       01  LS-RESULT                 PIC X(80).
       PROCEDURE DIVISION USING LS-DATE LS-DATE-FORMAT LS-RESULT.
       A000-MAIN.
           INITIALIZE WS-MESSAGE
           MOVE LENGTH OF LS-DATE TO VSTRING-LENGTH OF WS-DATE-TO-TEST
           MOVE LS-DATE TO VSTRING-TEXT OF WS-DATE-TO-TEST
           MOVE LENGTH OF LS-DATE-FORMAT
               TO VSTRING-LENGTH OF WS-DATE-FORMAT
           MOVE LS-DATE-FORMAT TO VSTRING-TEXT OF WS-DATE-FORMAT
           MOVE 0 TO OUTPUT-LILLIAN
           CALL "CEEDAYS" USING
               WS-DATE-TO-TEST
               WS-DATE-FORMAT
               OUTPUT-LILLIAN
               FEEDBACK-CODE
           MOVE SEVERITY OF FEEDBACK-CODE TO WS-SEVERITY-N
           MOVE MSG-NO OF FEEDBACK-CODE TO WS-MSG-NO-N
           EVALUATE TRUE
               WHEN FC-INVALID-DATE
                   MOVE 'Date is valid' TO WS-RESULT
               WHEN FC-BAD-DATE-VALUE
                   MOVE 'Datevalue error' TO WS-RESULT
               WHEN OTHER
                   MOVE 'Date is invalid' TO WS-RESULT
           END-EVALUATE
           MOVE WS-MESSAGE TO LS-RESULT
           MOVE WS-SEVERITY-N TO RETURN-CODE
           EXIT PROGRAM.
