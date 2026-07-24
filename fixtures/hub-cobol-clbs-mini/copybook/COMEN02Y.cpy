      ******************************************************************
      * Mini CardDemo COMEN02Y — main-menu options stub (resolve-only).
      * Upstream: app/cpy/COMEN02Y.cpy (Apache-2.0 CardDemo / COMEN01C).
      * Not a CICS XCTL dispatch runtime (D6442/D6447).
      ******************************************************************
       01  CARDDEMO-MAIN-MENU-OPTIONS.
           05  CDEMO-MENU-OPT-COUNT        PIC 9(02) VALUE 2.
           05  CDEMO-MENU-OPT-1-NAME       PIC X(35) VALUE
               'Account View                       '.
           05  CDEMO-MENU-OPT-1-PGM        PIC X(08) VALUE 'COACTVWC'.
           05  CDEMO-MENU-OPT-2-NAME       PIC X(35) VALUE
               'Account Update                     '.
           05  CDEMO-MENU-OPT-2-PGM        PIC X(08) VALUE 'COACTUPC'.
