      ******************************************************************
      * Mini CardDemo COADM02Y admin-options table for CARDONLN.
      * Resolved structural map — not full BMS; includes Db2 options 5–6
      * (COTRTLIC / COTRTUPC) matching upstream aws-carddemo COADM02Y (D6442).
      * Programs COTRTLIC/COTRTUPC stay unresolved; maps COTRTLI/COTRTUP resolve.
      ******************************************************************
       01  CARDDEMO-ADMIN-MENU-OPTIONS.
           05  CDEMO-ADMIN-OPT-COUNT       PIC 9(02) VALUE 6.
           05  CDEMO-ADMIN-OPTIONS-DATA.
               10  FILLER                  PIC 9(02) VALUE 1.
               10  FILLER                  PIC X(35) VALUE
                   'User List (Security)               '.
               10  FILLER                  PIC X(08) VALUE 'COUSR00C'.
               10  FILLER                  PIC 9(02) VALUE 2.
               10  FILLER                  PIC X(35) VALUE
                   'User Add (Security)                '.
               10  FILLER                  PIC X(08) VALUE 'COUSR01C'.
               10  FILLER                  PIC 9(02) VALUE 3.
               10  FILLER                  PIC X(35) VALUE
                   'User Update (Security)             '.
               10  FILLER                  PIC X(08) VALUE 'COUSR02C'.
               10  FILLER                  PIC 9(02) VALUE 4.
               10  FILLER                  PIC X(35) VALUE
                   'User Delete (Security)             '.
               10  FILLER                  PIC X(08) VALUE 'COUSR03C'.
               10  FILLER                  PIC 9(02) VALUE 5.
               10  FILLER                  PIC X(35) VALUE
                   'Transaction Type List/Update (Db2) '.
               10  FILLER                  PIC X(08) VALUE 'COTRTLIC'.
               10  FILLER                  PIC 9(02) VALUE 6.
               10  FILLER                  PIC X(35) VALUE
                   'Transaction Type Maintenance (Db2) '.
               10  FILLER                  PIC X(08) VALUE 'COTRTUPC'.
           05  CDEMO-ADMIN-OPTIONS REDEFINES CDEMO-ADMIN-OPTIONS-DATA.
               10  CDEMO-ADMIN-OPT OCCURS 6 TIMES.
                   15  CDEMO-ADMIN-OPT-NUM     PIC 9(02).
                   15  CDEMO-ADMIN-OPT-NAME    PIC X(35).
                   15  CDEMO-ADMIN-OPT-PGMNAME PIC X(08).
