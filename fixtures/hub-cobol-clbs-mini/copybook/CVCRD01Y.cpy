      ******************************************************************
      * Mini CardDemo CVCRD01Y — common card work-area AID stubs.
      * Upstream: app/cpy/CVCRD01Y.cpy (Apache-2.0 CardDemo).
      * Fixture-local resolve for COTRT deepen; DFHAID stays BMS hole
      * when programs also COPY DFHAID (D6442/D6447).
      ******************************************************************
       01  CC-WORK-AREAS.
           05  CC-WORK-AREA.
               10  CCARD-AID              PIC X(5).
                   88  CCARD-AID-ENTER     VALUE 'ENTER'.
                   88  CCARD-AID-CLEAR     VALUE 'CLEAR'.
                   88  CCARD-AID-PFK03     VALUE 'PFK03'.
               10  CCARD-NEXT-PROG        PIC X(8).
               10  CCARD-NEXT-MAPSET      PIC X(7).
               10  CCARD-NEXT-MAP         PIC X(7).
               10  CCARD-ERROR-MSG        PIC X(75).
               10  CCARD-RETURN-MSG       PIC X(75).
               10  CC-ACCT-ID             PIC X(11) VALUE SPACES.
               10  CC-CARD-NUM            PIC X(16) VALUE SPACES.
               10  CC-CUST-ID             PIC X(09) VALUE SPACES.
