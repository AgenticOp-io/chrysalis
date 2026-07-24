      ******************************************************************
      * Mini CardDemo CSMSG02Y — abend work areas (resolve-only).
      * Upstream: app/cpy/CSMSG02Y.cpy (Apache-2.0 CardDemo).
      * Not a CICS ABEND runtime (D6442/D6447).
      ******************************************************************
       01  ABEND-DATA.
           05  ABEND-CODE               PIC X(4) VALUE SPACES.
           05  ABEND-CULPRIT            PIC X(8) VALUE SPACES.
           05  ABEND-REASON             PIC X(50) VALUE SPACES.
           05  ABEND-MSG                PIC X(72) VALUE SPACES.
