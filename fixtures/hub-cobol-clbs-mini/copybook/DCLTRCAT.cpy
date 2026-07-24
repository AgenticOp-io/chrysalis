      ******************************************************************
      * Mini CardDemo DCLTRCAT — TRANSACTION_TYPE_CATEGORY host vars.
      * Upstream: app-transaction-type-db2/dcl/DCLTRCAT.dcl
      * EXEC SQL DECLARE TABLE stays an honest hole (D6442/D6447).
      ******************************************************************
           EXEC SQL DECLARE CARDDEMO.TRANSACTION_TYPE_CATEGORY TABLE
           ( TRC_TYPE_CODE                  CHAR(2) NOT NULL,
             TRC_TYPE_CATEGORY              CHAR(4) NOT NULL,
             TRC_CAT_DATA                   VARCHAR(50) NOT NULL
           ) END-EXEC.
       01  DCLTRANSACTION-TYPE-CATEGORY.
           10 DCL-TRC-TYPE-CODE    PIC X(2).
           10 DCL-TRC-TYPE-CATEGORY
              PIC X(4).
           10 DCL-TRC-CAT-DATA.
              49 DCL-TRC-CAT-DATA-LEN
                 PIC S9(4) USAGE COMP.
              49 DCL-TRC-CAT-DATA-TEXT
                 PIC X(50).
