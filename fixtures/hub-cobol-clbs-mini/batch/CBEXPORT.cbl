      ******************************************************************
      * CardDemo CBEXPORT-shaped structural probe (branch export).
      * Upstream: aws-carddemo app/cbl/CBEXPORT.cbl — indexed masters
      * → multi-record export. COPY CVCUS01Y/CVACT01Y/CVACT02Y/
      * CVACT03Y/CVEXPORT resolve; indexed-file + file-io stay honest
      * holes. No invented migration runtime (D6442/D6447). Not
      * behavioral.
      ******************************************************************
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CBEXPORT.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT CUSTOMER-INPUT ASSIGN TO CUSTFILE
               ORGANIZATION IS INDEXED
               ACCESS MODE IS SEQUENTIAL
               RECORD KEY IS CUST-ID
               FILE STATUS IS WS-CUSTOMER-STATUS.
           SELECT ACCOUNT-INPUT ASSIGN TO ACCTFILE
               ORGANIZATION IS INDEXED
               ACCESS MODE IS SEQUENTIAL
               RECORD KEY IS ACCT-ID
               FILE STATUS IS WS-ACCOUNT-STATUS.
           SELECT EXPORT-OUTPUT ASSIGN TO EXPFILE
               ORGANIZATION IS INDEXED
               ACCESS MODE IS SEQUENTIAL
               RECORD KEY IS EXPORT-SEQUENCE-NUM
               FILE STATUS IS WS-EXPORT-STATUS.
       DATA DIVISION.
       FILE SECTION.
       FD  CUSTOMER-INPUT.
       COPY CVCUS01Y.
       FD  ACCOUNT-INPUT.
       COPY CVACT01Y.
       FD  EXPORT-OUTPUT.
       01  EXPORT-OUTPUT-RECORD      PIC X(80).
       WORKING-STORAGE SECTION.
       COPY CVEXPORT.
       COPY CVACT02Y.
       COPY CVACT03Y.
       01  WS-CUSTOMER-STATUS        PIC X(2).
       01  WS-ACCOUNT-STATUS         PIC X(2).
       01  WS-EXPORT-STATUS          PIC X(2).
       01  WS-CUST-EOF               PIC X VALUE 'N'.
       PROCEDURE DIVISION.
       MAIN-LOGIC.
           OPEN INPUT CUSTOMER-INPUT
           OPEN INPUT ACCOUNT-INPUT
           OPEN OUTPUT EXPORT-OUTPUT
           PERFORM UNTIL WS-CUST-EOF = 'Y'
               READ CUSTOMER-INPUT
                   AT END
                       MOVE 'Y' TO WS-CUST-EOF
                   NOT AT END
                       MOVE 'C' TO EXPORT-REC-TYPE
                       MOVE CUST-ID TO EXP-CUST-ID
                       ADD 1 TO EXPORT-SEQUENCE-NUM
                       WRITE EXPORT-OUTPUT-RECORD FROM EXPORT-RECORD
               END-READ
           END-PERFORM
           CLOSE CUSTOMER-INPUT
           CLOSE ACCOUNT-INPUT
           CLOSE EXPORT-OUTPUT
           GOBACK.
