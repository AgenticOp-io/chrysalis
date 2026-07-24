      ******************************************************************
      * CardDemo CBSTM03A-shaped structural probe (batch statements).
      * Upstream: aws-carddemo app/cbl/CBSTM03A.CBL — CREASTMT job.
      * Sequential stmt/html outs + CALL CBSTM03B I/O; COPY COSTM01/
      * CVACT03Y/CUSTREC/CVACT01Y resolve; file-io stays honest hole
      * (subroutine CALL not invented). No invented statement/VSAM
      * runtime (D6442/D6447). Not behavioral.
      ******************************************************************
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CBSTM03A.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT STMT-FILE ASSIGN TO STMTFILE
               ORGANIZATION IS SEQUENTIAL
               FILE STATUS IS STMTFILE-STATUS.
           SELECT HTML-FILE ASSIGN TO HTMLFILE
               ORGANIZATION IS SEQUENTIAL
               FILE STATUS IS HTMLFILE-STATUS.
       DATA DIVISION.
       FILE SECTION.
       FD  STMT-FILE.
       01  FD-STMTFILE-REC           PIC X(80).
       FD  HTML-FILE.
       01  FD-HTMLFILE-REC           PIC X(100).
       WORKING-STORAGE SECTION.
       COPY COSTM01.
       COPY CVACT03Y.
       COPY CUSTREC.
       COPY CVACT01Y.
       01  STMTFILE-STATUS           PIC X(2).
       01  HTMLFILE-STATUS           PIC X(2).
       01  WS-M03B-AREA.
           05  WS-M03B-DD            PIC X(08).
           05  WS-M03B-OPER          PIC X(01).
           05  WS-M03B-RC            PIC X(02).
       PROCEDURE DIVISION.
       MAIN-LOGIC.
           OPEN OUTPUT STMT-FILE
           OPEN OUTPUT HTML-FILE
           MOVE 'TRNXFILE' TO WS-M03B-DD
           MOVE 'O' TO WS-M03B-OPER
           CALL 'CBSTM03B' USING WS-M03B-AREA
           WRITE FD-STMTFILE-REC FROM TRNX-RECORD
           WRITE FD-HTMLFILE-REC FROM CUST-FIRST-NAME
           CLOSE STMT-FILE
           CLOSE HTML-FILE
           GOBACK.
