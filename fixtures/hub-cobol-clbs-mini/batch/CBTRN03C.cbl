      ******************************************************************
      * CardDemo CBTRN03C-shaped structural probe (batch tran report).
      * Upstream: aws-carddemo app/cbl/CBTRN03C.cbl — TRANREPT job.
      * Sequential tran feed + INDEXED xref/type/cat; COPY CVTRA05Y/
      * CVACT03Y/CVTRA03Y/CVTRA04Y/CVTRA07Y resolve; indexed-file +
      * file-io stay honest holes. No invented VSAM/report runtime
      * (D6442/D6447). Not behavioral.
      ******************************************************************
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CBTRN03C.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT TRANSACT-FILE ASSIGN TO TRANFILE
               ORGANIZATION IS SEQUENTIAL
               FILE STATUS IS TRANFILE-STATUS.
           SELECT XREF-FILE ASSIGN TO CARDXREF
               ORGANIZATION IS INDEXED
               ACCESS MODE IS RANDOM
               RECORD KEY IS FD-XREF-CARD-NUM
               FILE STATUS IS CARDXREF-STATUS.
           SELECT TRANTYPE-FILE ASSIGN TO TRANTYPE
               ORGANIZATION IS INDEXED
               ACCESS MODE IS RANDOM
               RECORD KEY IS FD-TRAN-TYPE
               FILE STATUS IS TRANTYPE-STATUS.
           SELECT REPORT-FILE ASSIGN TO TRANREPT
               ORGANIZATION IS SEQUENTIAL
               FILE STATUS IS TRANREPT-STATUS.
       DATA DIVISION.
       FILE SECTION.
       FD  TRANSACT-FILE.
       01  FD-TRANFILE-REC           PIC X(80).
       FD  XREF-FILE.
       01  FD-CARDXREF-REC.
           05  FD-XREF-CARD-NUM      PIC X(16).
           05  FD-XREF-DATA          PIC X(34).
       FD  TRANTYPE-FILE.
       01  FD-TRANTYPE-REC.
           05  FD-TRAN-TYPE          PIC X(02).
           05  FD-TRAN-DATA          PIC X(50).
       FD  REPORT-FILE.
       01  FD-REPTFILE-REC           PIC X(133).
       WORKING-STORAGE SECTION.
       COPY CVTRA05Y.
       COPY CVACT03Y.
       COPY CVTRA03Y.
       COPY CVTRA04Y.
       COPY CVTRA07Y.
       01  TRANFILE-STATUS           PIC X(2).
       01  CARDXREF-STATUS           PIC X(2).
       01  TRANTYPE-STATUS           PIC X(2).
       01  TRANREPT-STATUS           PIC X(2).
       01  END-OF-FILE               PIC X VALUE 'N'.
       01  WS-TRAN-REC               PIC X(80).
       PROCEDURE DIVISION.
       MAIN-LOGIC.
           OPEN INPUT TRANSACT-FILE
           OPEN INPUT XREF-FILE
           OPEN INPUT TRANTYPE-FILE
           OPEN OUTPUT REPORT-FILE
           PERFORM UNTIL END-OF-FILE = 'Y'
               READ TRANSACT-FILE INTO WS-TRAN-REC
                   AT END
                       MOVE 'Y' TO END-OF-FILE
                   NOT AT END
                       WRITE FD-REPTFILE-REC FROM REPORT-NAME-HEADER
               END-READ
           END-PERFORM
           CLOSE TRANSACT-FILE
           CLOSE XREF-FILE
           CLOSE TRANTYPE-FILE
           CLOSE REPORT-FILE
           GOBACK.
