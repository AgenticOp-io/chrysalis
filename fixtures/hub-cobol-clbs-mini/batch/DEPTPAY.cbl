      *> OMP COBOL Programming Course #4 Lab — DEPTPAY (GnuCOBOL-runnable).
      *> Upstream: openmainframeproject/cobol-programming-course Labs/cbl/DEPTPAY.CBL
      *> AVG = 111111.11 / 19 → 5847.95 (no ROUNDED)
       IDENTIFICATION DIVISION.
       PROGRAM-ID. DEPTPAY.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  DEPT-RECORD.
           05  DEPT-NAME            PIC X(20).
           05  DEPT-LOC             PIC X(12).
           05  DEPT-MANAGER.
                10 MANAGER-FNAME    PIC X(15).
                10 MANAGER-LNAME    PIC X(15).
           05  DEPT-NBR-EMPS        PIC 9(3).
           05  DEPT-TOTAL-SALARIES  PIC 9(7)V99.
           05  DEPT-AVG-SALARY      PIC 9(7)V99.
       01  WS-AVG-OUT           PIC Z(6)9.99.
       PROCEDURE DIVISION.
       MAIN.
           PERFORM AVERAGE-SALARY
           MOVE DEPT-AVG-SALARY TO WS-AVG-OUT
           DISPLAY FUNCTION TRIM(WS-AVG-OUT LEADING)
           STOP RUN.
       AVERAGE-SALARY.
           MOVE "FINANCE"           TO DEPT-NAME
           MOVE "SOUTHWEST"         TO DEPT-LOC
           MOVE "Millard"           TO MANAGER-FNAME
           MOVE "Fillmore"          TO MANAGER-LNAME
           MOVE 19                  TO DEPT-NBR-EMPS
           MOVE 111111.11           TO DEPT-TOTAL-SALARIES
           COMPUTE DEPT-AVG-SALARY =
                (DEPT-TOTAL-SALARIES / DEPT-NBR-EMPS).
