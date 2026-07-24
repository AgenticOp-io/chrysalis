      ******************************************************************
      * Mini CardDemo DCLTRTYP — TRANSACTION_TYPE host vars (DCLGEN).
      * Upstream: app-transaction-type-db2/dcl/DCLTRTYP.dcl
      * EXEC SQL DECLARE TABLE stays an honest hole when INCLUDE'd —
      * no invented DB2 table catalog (D6442/D6447).
      ******************************************************************
           EXEC SQL DECLARE CARDDEMO.TRANSACTION_TYPE TABLE
           ( TR_TYPE                        CHAR(2) NOT NULL,
             TR_DESCRIPTION                 VARCHAR(50) NOT NULL
           ) END-EXEC.
       01  DCLTRANSACTION-TYPE.
           10 DCL-TR-TYPE          PIC X(2).
           10 DCL-TR-DESCRIPTION.
              49 DCL-TR-DESCRIPTION-LEN
                 PIC S9(4) USAGE COMP.
              49 DCL-TR-DESCRIPTION-TEXT
                 PIC X(50).
