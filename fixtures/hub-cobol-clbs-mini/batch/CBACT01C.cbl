      ******************************************************************
      * CardDemo CBACT01C-shaped structural probe (batch account dump).
      * Upstream: aws-carddemo app/cbl/CBACT01C.cbl — account INDEXED
      * sequential read → sequential outs. COPY CVACT01Y resolve;
      * indexed-file + file-io stay honest holes. No invented VSAM/
      * COBDATFT/date runtime (D6442/D6447). Not behavioral.
      ******************************************************************
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CBACT01C.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT ACCTFILE-FILE ASSIGN TO ACCTFILE
               ORGANIZATION IS INDEXED
               ACCESS MODE IS SEQUENTIAL
               RECORD KEY IS FD-ACCT-ID
               FILE STATUS IS ACCTFILE-STATUS.
           SELECT OUT-FILE ASSIGN TO OUTFILE
               ORGANIZATION IS SEQUENTIAL
               ACCESS MODE IS SEQUENTIAL
               FILE STATUS IS OUTFILE-STATUS.
       DATA DIVISION.
       FILE SECTION.
       FD  ACCTFILE-FILE.
       01  FD-ACCTFILE-REC.
           05  FD-ACCT-ID            PIC 9(11).
           05  FD-ACCT-DATA          PIC X(40).
       FD  OUT-FILE.
       01  OUT-ACCT-REC              PIC X(80).
       WORKING-STORAGE SECTION.
       COPY CVACT01Y.
       01  ACCTFILE-STATUS           PIC X(2).
       01  OUTFILE-STATUS            PIC X(2).
       01  END-OF-FILE               PIC X VALUE 'N'.
       PROCEDURE DIVISION.
       MAIN-LOGIC.
           OPEN INPUT ACCTFILE-FILE
           OPEN OUTPUT OUT-FILE
           PERFORM UNTIL END-OF-FILE = 'Y'
               READ ACCTFILE-FILE INTO ACCOUNT-RECORD
                   AT END
                       MOVE 'Y' TO END-OF-FILE
                   NOT AT END
                       WRITE OUT-ACCT-REC FROM ACCOUNT-RECORD
               END-READ
           END-PERFORM
           CLOSE ACCTFILE-FILE
           CLOSE OUT-FILE
           GOBACK.
