      ******************************************************************
      * Mini CardDemo CSLKPCDY — phone/state lookup stubs.
      * Upstream: app/cpy/CSLKPCDY.cpy (Apache-2.0 CardDemo / COACTUPC).
      * Resolve-only stub (not full NANPA tables); no invented runtime.
      ******************************************************************
       01  WS-US-PHONE-AREA-CODE-TO-EDIT PIC XXX.
           88 VALID-PHONE-AREA-CODE VALUES '201', '202', '212', '415'.
       01  WS-US-STATE-CODE-TO-EDIT PIC XX.
           88 VALID-US-STATE-CODE VALUES 'CA', 'NY', 'TX', 'WA'.
       01  WS-US-STATE-ZIP-PREFIX-TO-EDIT PIC X(4).
           88 VALID-STATE-ZIP-PREFIX VALUES 'CA90', 'NY10', 'TX75'.
