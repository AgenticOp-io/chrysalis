      ******************************************************************
      * CardDemo CBSTM03B-shaped structural probe (stmt I/O subroutine).
      * Upstream: aws-carddemo app/cbl/CBSTM03B.CBL — called by CBSTM03A.
      * INDEXED TRNX/XREF/CUST/ACCT + LINKAGE USING; indexed-file +
      * file-io stay honest holes. No invented VSAM/statement runtime
      * (D6442/D6447). Not behavioral.
      ******************************************************************
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CBSTM03B.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT TRNX-FILE ASSIGN TO TRNXFILE
               ORGANIZATION IS INDEXED
               ACCESS MODE IS SEQUENTIAL
               RECORD KEY IS FD-TRNXS-ID
               FILE STATUS IS TRNXFILE-STATUS.
           SELECT XREF-FILE ASSIGN TO XREFFILE
               ORGANIZATION IS INDEXED
               ACCESS MODE IS SEQUENTIAL
               RECORD KEY IS FD-XREF-CARD-NUM
               FILE STATUS IS XREFFILE-STATUS.
           SELECT CUST-FILE ASSIGN TO CUSTFILE
               ORGANIZATION IS INDEXED
               ACCESS MODE IS RANDOM
               RECORD KEY IS FD-CUST-ID
               FILE STATUS IS CUSTFILE-STATUS.
           SELECT ACCT-FILE ASSIGN TO ACCTFILE
               ORGANIZATION IS INDEXED
               ACCESS MODE IS RANDOM
               RECORD KEY IS FD-ACCT-ID
               FILE STATUS IS ACCTFILE-STATUS.
       DATA DIVISION.
       FILE SECTION.
       FD  TRNX-FILE.
       01  FD-TRNXFILE-REC.
           05  FD-TRNXS-ID           PIC X(32).
           05  FD-ACCT-DATA          PIC X(40).
       FD  XREF-FILE.
       01  FD-XREFFILE-REC.
           05  FD-XREF-CARD-NUM      PIC X(16).
           05  FD-XREF-DATA          PIC X(34).
       FD  CUST-FILE.
       01  FD-CUSTFILE-REC.
           05  FD-CUST-ID            PIC X(09).
           05  FD-CUST-DATA          PIC X(40).
       FD  ACCT-FILE.
       01  FD-ACCTFILE-REC.
           05  FD-ACCT-ID            PIC 9(11).
           05  FD-ACCT-DATA          PIC X(40).
       WORKING-STORAGE SECTION.
       01  TRNXFILE-STATUS           PIC X(2).
       01  XREFFILE-STATUS           PIC X(2).
       01  CUSTFILE-STATUS           PIC X(2).
       01  ACCTFILE-STATUS           PIC X(2).
       LINKAGE SECTION.
       01  LK-M03B-AREA.
           05  LK-M03B-DD            PIC X(08).
           05  LK-M03B-OPER          PIC X(01).
           05  LK-M03B-RC            PIC X(02).
           05  LK-M03B-FLDT          PIC X(80).
       PROCEDURE DIVISION USING LK-M03B-AREA.
       MAIN-LOGIC.
           EVALUATE LK-M03B-DD
               WHEN 'TRNXFILE'
                   OPEN INPUT TRNX-FILE
                   READ TRNX-FILE INTO LK-M03B-FLDT
                   CLOSE TRNX-FILE
                   MOVE TRNXFILE-STATUS TO LK-M03B-RC
               WHEN 'XREFFILE'
                   OPEN INPUT XREF-FILE
                   READ XREF-FILE INTO LK-M03B-FLDT
                   CLOSE XREF-FILE
                   MOVE XREFFILE-STATUS TO LK-M03B-RC
               WHEN 'CUSTFILE'
                   OPEN INPUT CUST-FILE
                   READ CUST-FILE INTO LK-M03B-FLDT
                   CLOSE CUST-FILE
                   MOVE CUSTFILE-STATUS TO LK-M03B-RC
               WHEN 'ACCTFILE'
                   OPEN INPUT ACCT-FILE
                   READ ACCT-FILE INTO LK-M03B-FLDT
                   CLOSE ACCT-FILE
                   MOVE ACCTFILE-STATUS TO LK-M03B-RC
               WHEN OTHER
                   CONTINUE
           END-EVALUATE
           GOBACK.
