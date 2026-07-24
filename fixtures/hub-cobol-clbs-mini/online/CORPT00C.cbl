      ******************************************************************
      * CardDemo CORPT00C-shaped structural probe (program, not map).
      * Upstream: aws-carddemo app/cbl/CORPT00C.cbl — report options
      * (RECEIVE/SEND + WRITEQ TD intrdr submit + XCTL). Catalog EXEC
      * CICS ops; COPY CORPT00/COCOM01Y/COTTL01Y/CSDAT01Y/CSMSG01Y/
      * CVTRA05Y resolve; DFHAID+DFHBMSCA stay BMS holes. WRITEQ is
      * CICS-only (no COBOL READ/WRITE verb → no file-io hole; no
      * invented JES/TDQ runtime) (D6442/D6447). Not behavioral.
      ******************************************************************
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CORPT00C.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-RESP-CD            PIC S9(9) COMP VALUE 0.
       01  WS-JCL-REC            PIC X(80) VALUE SPACES.
       01  WS-MAP-AREA.
           COPY CORPT00.
       COPY COCOM01Y.
       COPY COTTL01Y.
       COPY CSDAT01Y.
       COPY CSMSG01Y.
       COPY CVTRA05Y.
       COPY DFHAID.
       COPY DFHBMSCA.
       LINKAGE SECTION.
       01  DFHCOMMAREA.
           05  CA-OPTION         PIC X(01).
       PROCEDURE DIVISION USING DFHCOMMAREA.
       MAIN-LOGIC SECTION.
           EXEC CICS RECEIVE MAP('CORPT0A')
                MAPSET('CORPT00')
                INTO(WS-MAP-AREA)
                RESP(WS-RESP-CD)
           END-EXEC
           PERFORM P100-REPORT-SUBMIT
           EXEC CICS SEND MAP('CORPT0A')
                MAPSET('CORPT00')
                FROM(WS-MAP-AREA)
                RESP(WS-RESP-CD)
           END-EXEC
           EXEC CICS RETURN END-EXEC
           GOBACK.
       P100-REPORT-SUBMIT.
           EXEC CICS WRITEQ TD
                QUEUE('JOBS')
                FROM(WS-JCL-REC)
                LENGTH(80)
                RESP(WS-RESP-CD)
           END-EXEC.
       P800-RETURN.
           EXEC CICS XCTL PROGRAM('COMEN01C') END-EXEC.
