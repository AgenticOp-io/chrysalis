      *> CLBS PORTTEST structural probe — honest PORTFLIO + ERRHAND COPY.
      *> Upstream PORTTEST uses FUNCTION RANDOM (non-deterministic) to
      *> generate test portfolio rows. Do NOT invent a deterministic
      *> RANDOM façade (D6447). Inventory only: COPY resolve + sequential
      *> file + function-random hole. Not a behavioral subject.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. PORTTEST.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT TEST-FILE
               ASSIGN TO "porttest.dat"
               ORGANIZATION IS SEQUENTIAL
               FILE STATUS IS WS-FILE-STATUS.
       DATA DIVISION.
       FILE SECTION.
       FD  TEST-FILE.
           COPY PORTFLIO.
       WORKING-STORAGE SECTION.
           COPY ERRHAND.
       01  WS-VARIABLES.
           05  WS-FILE-STATUS      PIC X(2).
           05  WS-RECORD-COUNT     PIC 9(5) VALUE 0.
           05  WS-MAX-RECORDS      PIC 9(5) VALUE 3.
           05  WS-TYPE-SUB         PIC 9(1).
           05  WS-STATUS-SUB       PIC 9(1).
       01  WS-TEST-VALUES.
           05  WS-CLIENT-TYPES     PIC X(3) VALUE 'ICT'.
           05  WS-STATUS-TYPES     PIC X(3) VALUE 'ACS'.
           05  WS-NAME-PREFIX      PIC X(4) VALUE 'TEST'.
       PROCEDURE DIVISION.
       0000-MAIN.
           PERFORM 1000-INITIALIZE
           PERFORM 2000-GENERATE-RECORDS
              UNTIL WS-RECORD-COUNT >= WS-MAX-RECORDS
           PERFORM 3000-TERMINATE
           GOBACK.
       1000-INITIALIZE.
           OPEN OUTPUT TEST-FILE
           IF WS-FILE-STATUS NOT = ERR-VSAM-SUCCESS
               MOVE ERR-ERROR TO ERR-SEVERITY
               PERFORM 3000-TERMINATE
               GOBACK
           END-IF.
       2000-GENERATE-RECORDS.
           INITIALIZE PORT-RECORD
           STRING 'PORT' WS-RECORD-COUNT
               DELIMITED BY SIZE
               INTO PORT-ID
           MOVE FUNCTION RANDOM(WS-RECORD-COUNT) TO WS-TYPE-SUB
           COMPUTE WS-STATUS-SUB = FUNCTION RANDOM * 3 + 1
           MOVE WS-CLIENT-TYPES(WS-TYPE-SUB:1) TO PORT-CLIENT-TYPE
           MOVE WS-STATUS-TYPES(WS-STATUS-SUB:1) TO PORT-STATUS
           STRING WS-NAME-PREFIX WS-RECORD-COUNT
               DELIMITED BY SIZE
               INTO PORT-CLIENT-NAME
           WRITE PORT-RECORD
           IF WS-FILE-STATUS = ERR-VSAM-SUCCESS
               ADD 1 TO WS-RECORD-COUNT
           END-IF.
       3000-TERMINATE.
           CLOSE TEST-FILE.
