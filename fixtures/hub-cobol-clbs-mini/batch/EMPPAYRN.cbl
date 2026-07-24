      *> OMP Course #4 EMPPAY weekly gross extract (GnuCOBOL-runnable).
      *> Upstream: openmainframeproject/cobol-programming-course Labs/cbl/EMPPAY.CBL
      *> 19h * 23.50, hours < 40 → OT 0 → 446.50
       IDENTIFICATION DIVISION.
       PROGRAM-ID. EMPPAYRN.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  EMP-HOURLY-RATE      PIC 9(3)V99 VALUE 23.50.
       01  EMP-OT-RATE          PIC V99 VALUE 0.
       01  EMP-HOURS            PIC 9(3) VALUE 19.
       01  EMP-PAY-WEEK         PIC 9(7)V99 VALUE 0.
       01  WS-OUT               PIC ZZZZ9.99.
       PROCEDURE DIVISION.
       MAIN.
           PERFORM PAYMENT-WEEKLY
           MOVE EMP-PAY-WEEK TO WS-OUT
           DISPLAY FUNCTION TRIM(WS-OUT LEADING)
           GOBACK.
       PAYMENT-WEEKLY.
           IF EMP-HOURS >= 40
               MOVE .25 TO EMP-OT-RATE
           ELSE
               MOVE ZERO TO EMP-OT-RATE
           END-IF
           COMPUTE EMP-PAY-WEEK =
                (EMP-HOURS * EMP-HOURLY-RATE) * (1 + EMP-OT-RATE).
