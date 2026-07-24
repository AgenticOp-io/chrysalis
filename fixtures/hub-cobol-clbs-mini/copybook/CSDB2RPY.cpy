      ******************************************************************
      * Mini CardDemo CSDB2RPY — Db2 procedure stub for COTRTLIC INCLUDE.
      * Upstream CSDB2RPY embeds EXEC SQL priming/DSNTIAC formatting.
      * Resolve-only: keep a single honest EXEC SQL SELECT hole here —
      * no fake DB2 connectivity (D6442/D6447).
      ******************************************************************
       9998-PRIMING-QUERY.
           EXEC SQL
                SELECT 1
                  INTO :WS-DUMMY-DB2-INT
                  FROM SYSIBM.SYSDUMMY1
           END-EXEC
           .
       9998-PRIMING-QUERY-EXIT.
           EXIT
           .
