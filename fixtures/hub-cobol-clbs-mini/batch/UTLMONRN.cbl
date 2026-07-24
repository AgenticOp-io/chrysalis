      *> CLBS UTLMON00-shaped monitoring-control extract (INDEXED/VSAM-free).
      *> Upstream UTLMON00: sequential MONITOR-CONFIG/LOG/ALERT + INDEXED
      *> DB2-STATS + PERFORM collect/threshold/log/alert (COPY RTNCODE).
      *> This runnable adaptation: nested CALL … USING + EVALUATE TRUE on
      *> FUNC-INIT/COLL/THRS/ALOG/ALRT only (no sequential/INDEXED façade).
      *> Driver function 'THRS' → return code 26.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. UTLMONRN.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-FUNC            PIC X(4) VALUE 'THRS'.
           88  FUNC-INIT            VALUE 'INIT'.
           88  FUNC-COLL            VALUE 'COLL'.
           88  FUNC-THRS            VALUE 'THRS'.
           88  FUNC-ALOG            VALUE 'ALOG'.
           88  FUNC-ALRT            VALUE 'ALRT'.
       01  WS-RC              PIC 99 VALUE 0.
       01  WS-OUT             PIC 99.
       PROCEDURE DIVISION.
       MAIN.
           CALL "UTLMONSB" USING WS-FUNC WS-RC
           MOVE WS-RC TO WS-OUT
           DISPLAY WS-OUT
           GOBACK.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. UTLMONSB.
       DATA DIVISION.
       LINKAGE SECTION.
       01  LK-FUNC            PIC X(4).
           88  FUNC-INIT            VALUE 'INIT'.
           88  FUNC-COLL            VALUE 'COLL'.
           88  FUNC-THRS            VALUE 'THRS'.
           88  FUNC-ALOG            VALUE 'ALOG'.
           88  FUNC-ALRT            VALUE 'ALRT'.
       01  LK-RC              PIC 99.
       PROCEDURE DIVISION USING LK-FUNC LK-RC.
       DISP.
           EVALUATE TRUE
               WHEN FUNC-INIT
                   PERFORM PROC-INIT-MONITOR
               WHEN FUNC-COLL
                   PERFORM PROC-COLLECT-METRICS
               WHEN FUNC-THRS
                   PERFORM PROC-CHECK-THRESHOLDS
               WHEN FUNC-ALOG
                   PERFORM PROC-LOG-STATUS
               WHEN FUNC-ALRT
                   PERFORM PROC-GENERATE-ALERTS
               WHEN OTHER
                   MOVE 99 TO LK-RC
           END-EVALUATE
           GOBACK.
       PROC-INIT-MONITOR.
           MOVE 0 TO LK-RC.
       PROC-COLLECT-METRICS.
           MOVE 16 TO LK-RC.
       PROC-CHECK-THRESHOLDS.
           MOVE 26 TO LK-RC.
       PROC-LOG-STATUS.
           MOVE 36 TO LK-RC.
       PROC-GENERATE-ALERTS.
           MOVE 46 TO LK-RC.
       END PROGRAM UTLMONSB.
       END PROGRAM UTLMONRN.
