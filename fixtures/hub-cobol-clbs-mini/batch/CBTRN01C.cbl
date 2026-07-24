      ******************************************************************
      * CardDemo CBTRN01C-shaped structural probe (batch daily post).
      * Upstream: aws-carddemo app/cbl/CBTRN01C.cbl — sequential daily
      * feed + INDEXED cust/xref/card/acct/tran. COPY CVTRA06Y/CVCUS01Y/
      * CVACT03Y/CVACT02Y/CVACT01Y/CVTRA05Y resolve; indexed-file +
      * file-io stay honest holes. No invented VSAM post runtime
      * (D6442/D6447). Not behavioral.
      ******************************************************************
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CBTRN01C.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT DALYTRAN-FILE ASSIGN TO DALYTRAN
               ORGANIZATION IS SEQUENTIAL
               ACCESS MODE IS SEQUENTIAL
               FILE STATUS IS DALYTRAN-STATUS.
           SELECT XREF-FILE ASSIGN TO XREFFILE
               ORGANIZATION IS INDEXED
               ACCESS MODE IS RANDOM
               RECORD KEY IS FD-XREF-CARD-NUM
               FILE STATUS IS XREFFILE-STATUS.
           SELECT ACCOUNT-FILE ASSIGN TO ACCTFILE
               ORGANIZATION IS INDEXED
               ACCESS MODE IS RANDOM
               RECORD KEY IS FD-ACCT-ID
               FILE STATUS IS ACCTFILE-STATUS.
           SELECT TRANSACT-FILE ASSIGN TO TRANFILE
               ORGANIZATION IS INDEXED
               ACCESS MODE IS RANDOM
               RECORD KEY IS FD-TRANS-ID
               FILE STATUS IS TRANFILE-STATUS.
       DATA DIVISION.
       FILE SECTION.
       FD  DALYTRAN-FILE.
       01  FD-TRAN-RECORD.
           05  FD-TRAN-ID            PIC X(16).
           05  FD-CUST-DATA          PIC X(40).
       FD  XREF-FILE.
       01  FD-XREFFILE-REC.
           05  FD-XREF-CARD-NUM      PIC X(16).
           05  FD-XREF-DATA          PIC X(34).
       FD  ACCOUNT-FILE.
       01  FD-ACCTFILE-REC.
           05  FD-ACCT-ID            PIC 9(11).
           05  FD-ACCT-DATA          PIC X(40).
       FD  TRANSACT-FILE.
       01  FD-TRANFILE-REC.
           05  FD-TRANS-ID           PIC X(16).
           05  FD-ACCT-DATA          PIC X(40).
       WORKING-STORAGE SECTION.
       COPY CVTRA06Y.
       COPY CVCUS01Y.
       COPY CVACT03Y.
       COPY CVACT02Y.
       COPY CVACT01Y.
       COPY CVTRA05Y.
       01  DALYTRAN-STATUS           PIC X(2).
       01  XREFFILE-STATUS           PIC X(2).
       01  ACCTFILE-STATUS           PIC X(2).
       01  TRANFILE-STATUS           PIC X(2).
       01  END-OF-FILE               PIC X VALUE 'N'.
       PROCEDURE DIVISION.
       MAIN-LOGIC.
           OPEN INPUT DALYTRAN-FILE
           OPEN INPUT XREF-FILE
           OPEN INPUT ACCOUNT-FILE
           OPEN I-O TRANSACT-FILE
           PERFORM UNTIL END-OF-FILE = 'Y'
               READ DALYTRAN-FILE INTO DALYTRAN-RECORD
                   AT END
                       MOVE 'Y' TO END-OF-FILE
                   NOT AT END
                       MOVE DALYTRAN-CARD-NUM TO FD-XREF-CARD-NUM
                       READ XREF-FILE
                           INVALID KEY
                               CONTINUE
                       END-READ
               END-READ
           END-PERFORM
           CLOSE DALYTRAN-FILE
           CLOSE XREF-FILE
           CLOSE ACCOUNT-FILE
           CLOSE TRANSACT-FILE
           GOBACK.
