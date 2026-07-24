      ******************************************************************
      * Mini CardDemo CVTRA01Y — tran-category balance stub (resolve).
      * Upstream: app/cpy/CVTRA01Y.cpy (Apache-2.0 CardDemo / CBACT04C).
      * Not a VSAM TCATBALF runtime (D6442/D6447).
      ******************************************************************
       01  TRAN-CAT-BAL-RECORD.
           05  TRAN-CAT-KEY.
               10  TRANCAT-ACCT-ID             PIC 9(11).
               10  TRANCAT-TYPE-CD             PIC X(02).
               10  TRANCAT-CD                  PIC 9(04).
           05  TRAN-CAT-BAL                    PIC S9(09)V99.
