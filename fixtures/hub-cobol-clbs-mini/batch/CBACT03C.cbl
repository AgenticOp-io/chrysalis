      ******************************************************************
      * CardDemo CBACT03C-shaped structural probe (batch xref dump).
      * Upstream: aws-carddemo app/cbl/CBACT03C.cbl — xref INDEXED
      * sequential read. COPY CVACT03Y resolve; indexed-file + file-io
      * stay honest holes. No invented VSAM runtime (D6442/D6447).
      * Not behavioral.
      ******************************************************************
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CBACT03C.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT XREFFILE-FILE ASSIGN TO XREFFILE
               ORGANIZATION IS INDEXED
               ACCESS MODE IS SEQUENTIAL
               RECORD KEY IS FD-XREF-CARD-NUM
               FILE STATUS IS XREFFILE-STATUS.
       DATA DIVISION.
       FILE SECTION.
       FD  XREFFILE-FILE.
       01  FD-XREFFILE-REC.
           05  FD-XREF-CARD-NUM      PIC X(16).
           05  FD-XREF-DATA          PIC X(34).
       WORKING-STORAGE SECTION.
       COPY CVACT03Y.
       01  XREFFILE-STATUS           PIC X(2).
       01  END-OF-FILE               PIC X VALUE 'N'.
       PROCEDURE DIVISION.
       MAIN-LOGIC.
           OPEN INPUT XREFFILE-FILE
           PERFORM UNTIL END-OF-FILE = 'Y'
               READ XREFFILE-FILE INTO CARD-XREF-RECORD
                   AT END
                       MOVE 'Y' TO END-OF-FILE
                   NOT AT END
                       DISPLAY XREF-CARD-NUM
               END-READ
           END-PERFORM
           CLOSE XREFFILE-FILE
           GOBACK.
