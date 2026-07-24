      ******************************************************************
      * CardDemo CBIMPORT-shaped structural probe (branch import).
      * Upstream: aws-carddemo app/cbl/CBIMPORT.cbl — multi-record
      * export → normalized sequential outs. COPY CVEXPORT/CVCUS01Y/
      * CVACT01Y/CVACT02Y/CVACT03Y resolve; EVALUATE rec-type; indexed
      * + file-io stay honest holes. No invented migration runtime
      * (D6442/D6447). Not behavioral.
      ******************************************************************
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CBIMPORT.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT EXPORT-INPUT ASSIGN TO EXPFILE
               ORGANIZATION IS INDEXED
               ACCESS MODE IS SEQUENTIAL
               RECORD KEY IS EXPORT-SEQUENCE-NUM
               FILE STATUS IS WS-EXPORT-STATUS.
           SELECT CUSTOMER-OUTPUT ASSIGN TO CUSTOUT
               ORGANIZATION IS SEQUENTIAL
               ACCESS MODE IS SEQUENTIAL
               FILE STATUS IS WS-CUSTOMER-STATUS.
           SELECT ACCOUNT-OUTPUT ASSIGN TO ACCTOUT
               ORGANIZATION IS SEQUENTIAL
               ACCESS MODE IS SEQUENTIAL
               FILE STATUS IS WS-ACCOUNT-STATUS.
       DATA DIVISION.
       FILE SECTION.
       FD  EXPORT-INPUT.
       01  EXPORT-INPUT-RECORD       PIC X(80).
       FD  CUSTOMER-OUTPUT.
       COPY CVCUS01Y.
       FD  ACCOUNT-OUTPUT.
       COPY CVACT01Y.
       WORKING-STORAGE SECTION.
       COPY CVEXPORT.
       COPY CVACT02Y.
       COPY CVACT03Y.
       01  WS-EXPORT-STATUS          PIC X(2).
       01  WS-CUSTOMER-STATUS        PIC X(2).
       01  WS-ACCOUNT-STATUS         PIC X(2).
       01  WS-EXPORT-EOF             PIC X VALUE 'N'.
       PROCEDURE DIVISION.
       MAIN-LOGIC.
           OPEN INPUT EXPORT-INPUT
           OPEN OUTPUT CUSTOMER-OUTPUT
           OPEN OUTPUT ACCOUNT-OUTPUT
           PERFORM UNTIL WS-EXPORT-EOF = 'Y'
               READ EXPORT-INPUT INTO EXPORT-RECORD
                   AT END
                       MOVE 'Y' TO WS-EXPORT-EOF
                   NOT AT END
                       EVALUATE EXPORT-REC-TYPE
                           WHEN 'C'
                               MOVE EXP-CUST-ID TO CUST-ID
                               WRITE CUSTOMER-RECORD
                           WHEN 'A'
                               MOVE EXP-ACCT-ID TO ACCT-ID
                               WRITE ACCOUNT-RECORD
                           WHEN OTHER
                               CONTINUE
                       END-EVALUATE
               END-READ
           END-PERFORM
           CLOSE EXPORT-INPUT
           CLOSE CUSTOMER-OUTPUT
           CLOSE ACCOUNT-OUTPUT
           GOBACK.
