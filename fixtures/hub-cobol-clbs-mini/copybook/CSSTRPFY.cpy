      ******************************************************************
      * Mini CardDemo CSSTRPFY — AID→PFKey store paragraph (COPY text).
      * Upstream: app/cpy/CSSTRPFY.cpy (Apache-2.0 CardDemo).
      * Resolves as COPY; DFHAID/EIBAID symbols stay BMS holes when the
      * host program also COPY DFHAID — no fake CICS runtime (D6442).
      ******************************************************************
       YYYY-STORE-PFKEY.
           EVALUATE TRUE
             WHEN EIBAID IS EQUAL TO DFHENTER
               SET CCARD-AID-ENTER TO TRUE
             WHEN EIBAID IS EQUAL TO DFHCLEAR
               SET CCARD-AID-CLEAR TO TRUE
             WHEN EIBAID IS EQUAL TO DFHPF3
               SET CCARD-AID-PFK03 TO TRUE
           END-EVALUATE
           .
       YYYY-STORE-PFKEY-EXIT.
           EXIT.
