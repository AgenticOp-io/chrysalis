      ******************************************************************
      * CardDemo CBACT02C-shaped structural probe (batch card dump).
      * Upstream: aws-carddemo app/cbl/CBACT02C.cbl — card INDEXED
      * sequential read. COPY CVACT02Y resolve; indexed-file + file-io
      * stay honest holes. No invented VSAM runtime (D6442/D6447).
      * Not behavioral.
      ******************************************************************
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CBACT02C.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT CARDFILE-FILE ASSIGN TO CARDFILE
               ORGANIZATION IS INDEXED
               ACCESS MODE IS SEQUENTIAL
               RECORD KEY IS FD-CARD-NUM
               FILE STATUS IS CARDFILE-STATUS.
       DATA DIVISION.
       FILE SECTION.
       FD  CARDFILE-FILE.
       01  FD-CARDFILE-REC.
           05  FD-CARD-NUM           PIC X(16).
           05  FD-CARD-DATA          PIC X(40).
       WORKING-STORAGE SECTION.
       COPY CVACT02Y.
       01  CARDFILE-STATUS           PIC X(2).
       01  END-OF-FILE               PIC X VALUE 'N'.
       PROCEDURE DIVISION.
       MAIN-LOGIC.
           OPEN INPUT CARDFILE-FILE
           PERFORM UNTIL END-OF-FILE = 'Y'
               READ CARDFILE-FILE INTO CARD-RECORD
                   AT END
                       MOVE 'Y' TO END-OF-FILE
                   NOT AT END
                       DISPLAY CARD-NUM
               END-READ
           END-PERFORM
           CLOSE CARDFILE-FILE
           GOBACK.
