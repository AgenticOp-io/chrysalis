      ******************************************************************
      * CardDemo CBACT04C-shaped structural probe (batch interest).
      * Upstream: aws-carddemo app/cbl/CBACT04C.cbl — INTCALC job.
      * INDEXED account/xref + sequential interest WRITE; COPY
      * CVACT01Y/CVACT03Y/CVTRA01Y resolve; indexed-file + file-io
      * stay honest holes. No invented VSAM/interest runtime
      * (D6442/D6447). Not behavioral.
      ******************************************************************
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CBACT04C.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT ACCOUNT-FILE ASSIGN TO ACCTFILE
               ORGANIZATION IS INDEXED
               ACCESS MODE IS RANDOM
               RECORD KEY IS FD-ACCT-ID
               FILE STATUS IS ACCTFILE-STATUS.
           SELECT XREF-FILE ASSIGN TO XREFFILE
               ORGANIZATION IS INDEXED
               ACCESS MODE IS RANDOM
               RECORD KEY IS FD-XREF-CARD-NUM
               ALTERNATE RECORD KEY IS FD-XREF-ACCT-ID
               FILE STATUS IS XREFFILE-STATUS.
           SELECT TRANSACT-FILE ASSIGN TO TRANSACT
               ORGANIZATION IS SEQUENTIAL
               ACCESS MODE IS SEQUENTIAL
               FILE STATUS IS TRANFILE-STATUS.
       DATA DIVISION.
       FILE SECTION.
       FD  ACCOUNT-FILE.
       01  FD-ACCTFILE-REC.
           05  FD-ACCT-ID            PIC 9(11).
           05  FD-ACCT-DATA          PIC X(40).
       FD  XREF-FILE.
       01  FD-XREFFILE-REC.
           05  FD-XREF-CARD-NUM      PIC X(16).
           05  FD-XREF-ACCT-ID       PIC 9(11).
       FD  TRANSACT-FILE.
       01  FD-TRANFILE-REC           PIC X(80).
       WORKING-STORAGE SECTION.
       COPY CVACT01Y.
       COPY CVACT03Y.
       COPY CVTRA01Y.
       01  ACCTFILE-STATUS           PIC X(2).
       01  XREFFILE-STATUS           PIC X(2).
       01  TRANFILE-STATUS           PIC X(2).
       01  WS-MONTHLY-INT            PIC S9(09)V99 VALUE 0.
       01  WS-INT-RATE               PIC S9(03)V99 VALUE 1.5.
       PROCEDURE DIVISION.
       MAIN-LOGIC.
           OPEN I-O ACCOUNT-FILE
           OPEN INPUT XREF-FILE
           OPEN OUTPUT TRANSACT-FILE
           MOVE 10000000001 TO FD-ACCT-ID
           READ ACCOUNT-FILE INTO ACCOUNT-RECORD
               INVALID KEY
                   MOVE 0 TO ACCT-CURR-BAL
           END-READ
           COMPUTE WS-MONTHLY-INT =
               (ACCT-CURR-BAL * WS-INT-RATE) / 1200
           ADD WS-MONTHLY-INT TO ACCT-CURR-BAL
           REWRITE FD-ACCTFILE-REC FROM ACCOUNT-RECORD
           WRITE FD-TRANFILE-REC FROM TRAN-CAT-BAL-RECORD
           CLOSE ACCOUNT-FILE
           CLOSE XREF-FILE
           CLOSE TRANSACT-FILE
           GOBACK.
