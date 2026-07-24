      ******************************************************************
      * CardDemo CBTRN02C-shaped structural probe (batch post-tran).
      * Upstream: aws-carddemo app/cbl/CBTRN02C.cbl — POSTTRAN job.
      * Sequential daily feed + INDEXED account/tran; COPY
      * CVACT01Y/CVACT03Y resolve; indexed-file + file-io stay honest
      * holes. No invented VSAM post runtime (D6442/D6447). Not
      * behavioral.
      ******************************************************************
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CBTRN02C.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT DALYTRAN-FILE ASSIGN TO DALYTRAN
               ORGANIZATION IS SEQUENTIAL
               ACCESS MODE IS SEQUENTIAL
               FILE STATUS IS DALYTRAN-STATUS.
           SELECT TRANSACT-FILE ASSIGN TO TRANFILE
               ORGANIZATION IS INDEXED
               ACCESS MODE IS RANDOM
               RECORD KEY IS FD-TRANS-ID
               FILE STATUS IS TRANFILE-STATUS.
           SELECT ACCOUNT-FILE ASSIGN TO ACCTFILE
               ORGANIZATION IS INDEXED
               ACCESS MODE IS RANDOM
               RECORD KEY IS FD-ACCT-ID
               FILE STATUS IS ACCTFILE-STATUS.
           SELECT XREF-FILE ASSIGN TO XREFFILE
               ORGANIZATION IS INDEXED
               ACCESS MODE IS RANDOM
               RECORD KEY IS FD-XREF-CARD-NUM
               FILE STATUS IS XREFFILE-STATUS.
       DATA DIVISION.
       FILE SECTION.
       FD  DALYTRAN-FILE.
       01  FD-TRAN-RECORD.
           05  FD-TRAN-ID            PIC X(16).
           05  FD-TRAN-AMT           PIC S9(09)V99.
           05  FD-TRAN-CARD          PIC X(16).
       FD  TRANSACT-FILE.
       01  FD-TRANFILE-REC.
           05  FD-TRANS-ID           PIC X(16).
           05  FD-ACCT-DATA          PIC X(40).
       FD  ACCOUNT-FILE.
       01  FD-ACCTFILE-REC.
           05  FD-ACCT-ID            PIC 9(11).
           05  FD-ACCT-DATA          PIC X(40).
       FD  XREF-FILE.
       01  FD-XREFFILE-REC.
           05  FD-XREF-CARD-NUM      PIC X(16).
           05  FD-XREF-ACCT-ID       PIC 9(11).
       WORKING-STORAGE SECTION.
       COPY CVACT01Y.
       COPY CVACT03Y.
       01  DALYTRAN-STATUS           PIC X(2).
       01  TRANFILE-STATUS           PIC X(2).
       01  ACCTFILE-STATUS           PIC X(2).
       01  XREFFILE-STATUS           PIC X(2).
       01  WS-FAIL-REASON            PIC 9(04) VALUE 0.
       01  END-OF-FILE               PIC X VALUE 'N'.
       PROCEDURE DIVISION.
       MAIN-LOGIC.
           OPEN INPUT DALYTRAN-FILE
           OPEN OUTPUT TRANSACT-FILE
           OPEN I-O ACCOUNT-FILE
           OPEN INPUT XREF-FILE
           PERFORM UNTIL END-OF-FILE = 'Y'
               READ DALYTRAN-FILE
                   AT END
                       MOVE 'Y' TO END-OF-FILE
                   NOT AT END
                       MOVE 0 TO WS-FAIL-REASON
                       MOVE FD-TRAN-CARD TO FD-XREF-CARD-NUM
                       READ XREF-FILE INTO CARD-XREF-RECORD
                           INVALID KEY
                               MOVE 100 TO WS-FAIL-REASON
                       END-READ
                       IF WS-FAIL-REASON = 0
                           MOVE XREF-ACCT-ID TO FD-ACCT-ID
                           READ ACCOUNT-FILE INTO ACCOUNT-RECORD
                           ADD FD-TRAN-AMT TO ACCT-CURR-BAL
                           REWRITE FD-ACCTFILE-REC FROM ACCOUNT-RECORD
                           MOVE FD-TRAN-ID TO FD-TRANS-ID
                           WRITE FD-TRANFILE-REC
                       END-IF
               END-READ
           END-PERFORM
           CLOSE DALYTRAN-FILE
           CLOSE TRANSACT-FILE
           CLOSE ACCOUNT-FILE
           CLOSE XREF-FILE
           GOBACK.
