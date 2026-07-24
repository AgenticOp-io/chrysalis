      ******************************************************************
      * Mini CardDemo statement area stub — resolved COPY for CBSTM03A.
      * Upstream-shaped COSTM01 (2D card/tran arrays); fixture-local.
      ******************************************************************
       01  WS-CARD-TABLE.
           05  WS-CARD-ENTRY OCCURS 50 TIMES.
               10  WS-CARD-NUM       PIC X(16).
               10  WS-TRCT           PIC 9(04).
               10  WS-TRAN-ENTRY OCCURS 20 TIMES.
                   15  WS-TRAN-NUM   PIC X(16).
                   15  WS-TRAN-REST  PIC X(40).
       01  TRNX-RECORD.
           05  TRNX-CARD-NUM         PIC X(16).
           05  TRNX-ID               PIC X(16).
           05  TRNX-AMT              PIC S9(09)V99.
           05  TRNX-DESC             PIC X(40).
           05  TRNX-REST             PIC X(40).
