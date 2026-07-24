      ******************************************************************
      * CardDemo COBSWAIT-shaped structural probe (batch wait utility).
      * Upstream: aws-carddemo app/cbl/COBSWAIT.cbl — ACCEPT SYSIN parm
      * (centiseconds) + CALL 'MVSWAIT'. call + accept stay honest holes.
      * No invented MVSWAIT / sleep runtime (D6442/D6447). Not behavioral.
      ******************************************************************
       IDENTIFICATION DIVISION.
       PROGRAM-ID. COBSWAIT.
       ENVIRONMENT DIVISION.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  MVSWAIT-TIME              PIC 9(8) COMP.
       01  PARM-VALUE                PIC X(8).
       PROCEDURE DIVISION.
       MAIN-LOGIC.
           ACCEPT PARM-VALUE FROM SYSIN
           MOVE PARM-VALUE TO MVSWAIT-TIME
           CALL 'MVSWAIT' USING MVSWAIT-TIME
           STOP RUN.
