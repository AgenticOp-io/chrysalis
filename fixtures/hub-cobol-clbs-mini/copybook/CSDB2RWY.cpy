      ******************************************************************
      * Mini CardDemo CSDB2RWY — Db2 common WS for COTRTLIC INCLUDE.
      * Upstream: aws-carddemo app-transaction-type-db2/cpy/CSDB2RWY.cpy
      * Structural resolve only — no fake DB2/DSNTIAC runtime (D6442/D6447).
      ******************************************************************
           05  WS-DB2-COMMON-VARS.
               10 WS-DISP-SQLCODE                    PIC ----9.
               10 WS-DUMMY-DB2-INT                   PIC S9(4) COMP-3
                                                     VALUE 0.
               10 WS-DB2-PROCESSING-FLAG             PIC X(1).
                  88  WS-DB2-OK                      VALUE '0'.
                  88  WS-DB2-ERROR                   VALUE '1'.
               10 WS-DB2-CURRENT-ACTION              PIC X(72)
                                                     VALUE SPACES.
           05  WS-DSNTIAC-FORMATTED.
               10  WS-DSNTIAC-MESG-LEN   PIC S9(4) USAGE COMP VALUE +720.
               10  WS-DSNTIAC-FMTD-TEXT.
                   15 WS-DSNTIAC-FMTD-TEXT-LINE
                                         PIC X(72)
                                         OCCURS 10 TIMES
                                         VALUE SPACES.
           05 WS-DSNTIAC-LRECL          PIC S9(4) USAGE COMP VALUE +72.
           05 WS-DSNTIAC-ERROR.
               10 WS-DSNTIAC-ERR-MSG     PIC X(10) VALUE 'DSNTIAC CD'.
               10 WS-DSNTIAC-ERR-CD-X    PIC X(02) VALUE SPACES.
               10 WS-DSNTIAC-ERR-CD      REDEFINES
                  WS-DSNTIAC-ERR-CD-X    PIC 9(02).
