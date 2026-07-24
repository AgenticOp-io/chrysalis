      ******************************************************************
      * Mini CardDemo CVEXPORT — multi-record export stub (resolve).
      * Upstream: app/cpy/CVEXPORT.cpy (Apache-2.0 CardDemo CBEXPORT/
      * CBIMPORT). Not a branch-migration file runtime (D6442/D6447).
      ******************************************************************
       01  EXPORT-RECORD.
           05  EXPORT-REC-TYPE                 PIC X(1).
           05  EXPORT-TIMESTAMP                PIC X(26).
           05  EXPORT-SEQUENCE-NUM             PIC 9(9).
           05  EXPORT-BRANCH-ID                PIC X(4).
           05  EXPORT-REGION-CODE              PIC X(5).
           05  EXP-CUST-ID                     PIC 9(09).
           05  EXP-ACCT-ID                     PIC 9(11).
           05  EXP-XREF-CARD-NUM               PIC X(16).
           05  EXP-CARD-NUM                    PIC X(16).
