      ******************************************************************
      * CardDemo CBCUS01C-shaped structural probe (batch customer dump).
      * Upstream: aws-carddemo app/cbl/CBCUS01C.cbl — INDEXED customer
      * sequential read + DISPLAY. COPY CVCUS01Y resolve; indexed-file +
      * file-io stay honest holes. No invented VSAM/CEE3ABD runtime
      * (D6442/D6447). Not behavioral.
      ******************************************************************
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CBCUS01C.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT CUSTFILE-FILE ASSIGN TO CUSTFILE
               ORGANIZATION IS INDEXED
               ACCESS MODE IS SEQUENTIAL
               RECORD KEY IS FD-CUST-ID
               FILE STATUS IS CUSTFILE-STATUS.
       DATA DIVISION.
       FILE SECTION.
       FD  CUSTFILE-FILE.
       01  FD-CUSTFILE-REC.
           05  FD-CUST-ID            PIC 9(09).
           05  FD-CUST-DATA          PIC X(40).
       WORKING-STORAGE SECTION.
       COPY CVCUS01Y.
       01  CUSTFILE-STATUS           PIC X(2).
       01  END-OF-FILE               PIC X VALUE 'N'.
       PROCEDURE DIVISION.
       MAIN-LOGIC.
           OPEN INPUT CUSTFILE-FILE
           PERFORM UNTIL END-OF-FILE = 'Y'
               READ CUSTFILE-FILE INTO CUSTOMER-RECORD
                   AT END
                       MOVE 'Y' TO END-OF-FILE
                   NOT AT END
                       DISPLAY CUSTOMER-RECORD
               END-READ
           END-PERFORM
           CLOSE CUSTFILE-FILE
           GOBACK.
