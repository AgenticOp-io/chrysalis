      ******************************************************************
      * CardDemo-shaped online structural probe (hub; dedicated
      * COBIL00C/COTRN00C-02C/CORPT00C programs exist).
      * Catalogued from aws-carddemo COBIL00C / COTRN00C / CORPT00C /
      * COSGN00C / COADM01C / COCRDLIC / COCRDSLC / COCRDUPC / COACTUPC
      * idioms:
      * HANDLE, ASKTIME, FORMATTIME, RECEIVE/SEND MAP, SEND TEXT,
      * READ/REWRITE/WRITE, STARTBR/READNEXT/READPREV/ENDBR, LINK/XCTL/
      * RETURN, ASSIGN, SYNCPOINT, ABEND, GETMAIN/FREEMAIN, DELAY,
      * INQUIRE — honest CICS holes. No fake CICS runtime.
      * LINKAGE DFHCOMMAREA + PROCEDURE DIVISION USING + browse LINK
      * COMMAREA/LENGTH idioms deepen CardDemo browse/linkage shape.
      * COPY COCOM01Y/COBIL00/COTRN00/COTRN01/COTRN02/CORPT00/COACTVW/
      * COACTUP/COMEN01/COUSR00/COUSR01/COUSR02/COUSR03/
      * COADM01/COADM02Y/COCRDLI/COCRDSL/COCRDUP/COSGN00/
      * COTRTLI/COTRTUP (Db2 option maps) /
      * CSUSR01Y/CSMSG01Y/COTTL01Y/CSDAT01Y/CVTRA05Y/CVACT01Y/CVACT02Y/
      * CVACT03Y resolve; COACTUPC-shaped CSUTLDPY/CSLKPCDY resolve;
      * DFHAID + DFHBMSCA stay unresolved BMS holes
      * (no invented AID/attribute/DB2/date/lookup runtime).
      ******************************************************************
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CARDONLN.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-FLAGS.
           05 WS-RESP-CD            PIC S9(8) COMP VALUE 0.
           05 WS-OPTION             PIC X VALUE '1'.
           05 WS-ABS-TIME           PIC S9(15) COMP-3 VALUE 0.
           05 WS-DATE-STR           PIC X(10) VALUE SPACES.
           05 WS-PTR                PIC S9(8) COMP VALUE 0.
           05 WS-CA-LENGTH          PIC S9(4) COMP VALUE 0.
           05 WS-BROWSE-DONE        PIC X VALUE 'N'.
       01  WS-BILL-MAP.
           COPY COBIL00.
       01  WS-TRN-MAP.
           COPY COTRN00.
       01  WS-TRN-VIEW-MAP.
           COPY COTRN01.
       01  WS-TRN-ADD-MAP.
           COPY COTRN02.
       01  WS-RPT-MAP.
           COPY CORPT00.
       01  WS-ACCT-VIEW-MAP.
           COPY COACTVW.
       01  WS-ACCT-UP-MAP.
           COPY COACTUP.
       01  WS-MENU-MAP.
           COPY COMEN01.
       01  WS-USR-LIST-MAP.
           COPY COUSR00.
       01  WS-USR-ADD-MAP.
           COPY COUSR01.
       01  WS-USR-UPD-MAP.
           COPY COUSR02.
       01  WS-USR-DEL-MAP.
           COPY COUSR03.
       01  WS-ADMIN-MAP.
           COPY COADM01.
       01  WS-CARD-LIST-MAP.
           COPY COCRDLI.
       01  WS-CARD-VIEW-MAP.
           COPY COCRDSL.
       01  WS-CARD-UP-MAP.
           COPY COCRDUP.
       01  WS-SIGNON-MAP.
           COPY COSGN00.
       01  WS-TRNTYPE-LIST-MAP.
           COPY COTRTLI.
       01  WS-TRNTYPE-UP-MAP.
           COPY COTRTUP.
       01  WS-TITLE-AREA.
           COPY COTTL01Y.
       01  WS-DATE-AREA.
           COPY CSDAT01Y.
       01  WS-MSG-AREA.
           COPY CSMSG01Y.
       01  WS-TRAN-CAT.
           COPY CVTRA05Y.
       COPY CVACT01Y.
       COPY CVACT02Y.
       COPY CVACT03Y.
       COPY COADM02Y.
       COPY CSUSR01Y.
       COPY CSLKPCDY.
       01  WS-TRN-KEY               PIC X(16) VALUE SPACES.
       01  WS-TRN-REC.
           05 WS-TRN-ID             PIC X(16).
           05 WS-TRN-AMT            PIC S9(9)V99 COMP-3.
      * Upstream CardDemo COPYs DFHAID / DFHBMSCA (BMS) — leave unresolved holes.
       COPY DFHAID.
       COPY DFHBMSCA.
       LINKAGE SECTION.
       01  DFHCOMMAREA.
           COPY COCOM01Y.
       PROCEDURE DIVISION USING DFHCOMMAREA.
       MAIN-LOGIC SECTION.
           EXEC CICS HANDLE CONDITION
                ERROR(P900-ABEND)
                NOTFND(P900-ABEND)
                DUPREC(P900-ABEND)
                ENDFILE(P700-ENDBR)
           END-EXEC.
           EXEC CICS HANDLE AID
                ENTER(P100-PROCESS)
                PF3(P800-RETURN-MENU)
                PF12(P800-RETURN-MENU)
           END-EXEC.
           EXEC CICS HANDLE ABEND
                LABEL(P900-ABEND)
           END-EXEC.
           EXEC CICS ASKTIME
                ABSTIME(WS-ABS-TIME)
           END-EXEC.
           EXEC CICS FORMATTIME
                ABSTIME(WS-ABS-TIME)
                YYYYMMDD(WS-DATE-STR)
           END-EXEC.
           EXEC CICS ASSIGN
                APPLID(DFHCOMMAREA)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS GETMAIN
                SET(WS-PTR)
                LENGTH(100)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS DELAY
                INTERVAL(0)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS INQUIRE
                FILE('ACCTDAT')
                RESP(WS-RESP-CD)
           END-EXEC.
           MOVE LENGTH OF DFHCOMMAREA TO WS-CA-LENGTH
           PERFORM P100-PROCESS THRU P100-EXIT.
           EXEC CICS FREEMAIN
                DATA(WS-PTR)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS RETURN TRANSID('CB00')
                COMMAREA(DFHCOMMAREA)
                LENGTH(WS-CA-LENGTH)
           END-EXEC.
           GOBACK.
       BILL-ROUTER SECTION.
       P100-PROCESS.
           EXEC CICS RECEIVE MAP('COBIL00')
                MAPSET('COBIL00')
                INTO(WS-BILL-MAP)
                RESP(WS-RESP-CD)
           END-EXEC.
           EVALUATE WS-OPTION
               WHEN '1'
                   PERFORM P200-PAY-FULL THRU P200-EXIT
               WHEN '2'
                   PERFORM P300-PAY-PARTIAL THRU P300-EXIT
               WHEN '3'
                   PERFORM P400-BROWSE THRU P400-EXIT
               WHEN '4'
                   PERFORM P500-REPORT THRU P500-EXIT
               WHEN '5'
                   PERFORM P600-ACCT-VIEW THRU P600-EXIT
               WHEN '6'
                   PERFORM P610-ACCT-UPDATE THRU P610-EXIT
               WHEN '7'
                   PERFORM P620-USER-ADMIN THRU P620-EXIT
               WHEN '8'
                   PERFORM P630-ADMIN-MENU THRU P630-EXIT
               WHEN '9'
                   PERFORM P640-CARD-LIST THRU P640-EXIT
               WHEN 'A'
                   PERFORM P650-CARD-VIEW THRU P650-EXIT
               WHEN 'B'
                   PERFORM P660-CARD-UPDATE THRU P660-EXIT
               WHEN 'S'
                   PERFORM P670-SIGNON THRU P670-EXIT
               WHEN 'X'
                   PERFORM P800-RETURN-MENU THRU P800-EXIT
               WHEN OTHER
                   PERFORM P900-ABEND THRU P900-EXIT
           END-EVALUATE.
       P100-EXIT.
           EXIT.
       PAY-FULL SECTION.
       P200-PAY-FULL.
           EXEC CICS LINK PROGRAM('COTRN02C')
                COMMAREA(DFHCOMMAREA)
                LENGTH(WS-CA-LENGTH)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS RECEIVE MAP('COTRN02')
                MAPSET('COTRN02')
                INTO(WS-TRN-ADD-MAP)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS SEND MAP('COTRN02')
                MAPSET('COTRN02')
                FROM(WS-TRN-ADD-MAP)
                ERASE
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS SEND MAP('COBIL00')
                MAPSET('COBIL00')
                FROM(WS-BILL-MAP)
                ERASE
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS SYNCPOINT
                RESP(WS-RESP-CD)
           END-EXEC.
       P200-EXIT.
           EXIT.
       PAY-PARTIAL SECTION.
       P300-PAY-PARTIAL.
           EXEC CICS READ
                FILE('ACCTDAT')
                INTO(DFHCOMMAREA)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS REWRITE
                FILE('ACCTDAT')
                FROM(DFHCOMMAREA)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS WRITE
                FILE('TRANSACT')
                FROM(DFHCOMMAREA)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS DELETE
                FILE('TRANSACT')
                RESP(WS-RESP-CD)
           END-EXEC.
       P300-EXIT.
           EXIT.
       BROWSE-TXN SECTION.
       P400-BROWSE.
           MOVE LOW-VALUES TO WS-TRN-KEY
           MOVE 'N' TO WS-BROWSE-DONE
           EXEC CICS STARTBR
                FILE('TRANSACT')
                RIDFLD(WS-TRN-KEY)
                RESP(WS-RESP-CD)
           END-EXEC.
           PERFORM UNTIL WS-BROWSE-DONE = 'Y'
               EXEC CICS READNEXT
                    FILE('TRANSACT')
                    INTO(WS-TRN-REC)
                    RIDFLD(WS-TRN-KEY)
                    RESP(WS-RESP-CD)
               END-EXEC
               EXEC CICS READPREV
                    FILE('TRANSACT')
                    INTO(WS-TRN-REC)
                    RIDFLD(WS-TRN-KEY)
                    RESP(WS-RESP-CD)
               END-EXEC
               EXEC CICS LINK PROGRAM('COTRN00C')
                    COMMAREA(DFHCOMMAREA)
                    LENGTH(WS-CA-LENGTH)
                    RESP(WS-RESP-CD)
               END-EXEC
               EXEC CICS LINK PROGRAM('COTRN01C')
                    COMMAREA(DFHCOMMAREA)
                    LENGTH(WS-CA-LENGTH)
                    RESP(WS-RESP-CD)
               END-EXEC
               EXEC CICS RECEIVE MAP('COTRN01')
                    MAPSET('COTRN01')
                    INTO(WS-TRN-VIEW-MAP)
                    RESP(WS-RESP-CD)
               END-EXEC
               EXEC CICS SEND MAP('COTRN01')
                    MAPSET('COTRN01')
                    FROM(WS-TRN-VIEW-MAP)
                    RESP(WS-RESP-CD)
               END-EXEC
               MOVE 'Y' TO WS-BROWSE-DONE
           END-PERFORM
           PERFORM P700-ENDBR THRU P700-EXIT.
       P400-EXIT.
           EXIT.
       REPORT-OPTS SECTION.
       P500-REPORT.
           EXEC CICS LINK PROGRAM('CORPT00C')
                COMMAREA(DFHCOMMAREA)
                LENGTH(WS-CA-LENGTH)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS RECEIVE MAP('CORPT00')
                MAPSET('CORPT00')
                INTO(WS-RPT-MAP)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS SEND MAP('CORPT00')
                MAPSET('CORPT00')
                FROM(WS-RPT-MAP)
                ERASE
                RESP(WS-RESP-CD)
           END-EXEC.
       P500-EXIT.
           EXIT.
       ACCT-VIEW SECTION.
       P600-ACCT-VIEW.
           EXEC CICS LINK PROGRAM('COACTVWC')
                COMMAREA(DFHCOMMAREA)
                LENGTH(WS-CA-LENGTH)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS RECEIVE MAP('COACTVW')
                MAPSET('COACTVW')
                INTO(WS-ACCT-VIEW-MAP)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS SEND MAP('COACTVW')
                MAPSET('COACTVW')
                FROM(WS-ACCT-VIEW-MAP)
                RESP(WS-RESP-CD)
           END-EXEC.
       P600-EXIT.
           EXIT.
       ACCT-UPDATE SECTION.
       P610-ACCT-UPDATE.
           EXEC CICS LINK PROGRAM('COACTUPC')
                COMMAREA(DFHCOMMAREA)
                LENGTH(WS-CA-LENGTH)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS RECEIVE MAP('COACTUP')
                MAPSET('COACTUP')
                INTO(WS-ACCT-UP-MAP)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS SEND MAP('COACTUP')
                MAPSET('COACTUP')
                FROM(WS-ACCT-UP-MAP)
                RESP(WS-RESP-CD)
           END-EXEC.
       P610-EXIT.
           EXIT.
       USER-ADMIN SECTION.
       P620-USER-ADMIN.
           EXEC CICS LINK PROGRAM('COUSR00C')
                COMMAREA(DFHCOMMAREA)
                LENGTH(WS-CA-LENGTH)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS RECEIVE MAP('COUSR00')
                MAPSET('COUSR00')
                INTO(WS-USR-LIST-MAP)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS SEND MAP('COUSR00')
                MAPSET('COUSR00')
                FROM(WS-USR-LIST-MAP)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS LINK PROGRAM('COUSR01C')
                COMMAREA(DFHCOMMAREA)
                LENGTH(WS-CA-LENGTH)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS RECEIVE MAP('COUSR01')
                MAPSET('COUSR01')
                INTO(WS-USR-ADD-MAP)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS SEND MAP('COUSR01')
                MAPSET('COUSR01')
                FROM(WS-USR-ADD-MAP)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS LINK PROGRAM('COUSR02C')
                COMMAREA(DFHCOMMAREA)
                LENGTH(WS-CA-LENGTH)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS RECEIVE MAP('COUSR02')
                MAPSET('COUSR02')
                INTO(WS-USR-UPD-MAP)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS SEND MAP('COUSR02')
                MAPSET('COUSR02')
                FROM(WS-USR-UPD-MAP)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS LINK PROGRAM('COUSR03C')
                COMMAREA(DFHCOMMAREA)
                LENGTH(WS-CA-LENGTH)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS RECEIVE MAP('COUSR03')
                MAPSET('COUSR03')
                INTO(WS-USR-DEL-MAP)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS SEND MAP('COUSR03')
                MAPSET('COUSR03')
                FROM(WS-USR-DEL-MAP)
                RESP(WS-RESP-CD)
           END-EXEC.
       P620-EXIT.
           EXIT.
       ADMIN-MENU SECTION.
       P630-ADMIN-MENU.
           EXEC CICS LINK PROGRAM('COADM01C')
                COMMAREA(DFHCOMMAREA)
                LENGTH(WS-CA-LENGTH)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS RECEIVE MAP('COADM01')
                MAPSET('COADM01')
                INTO(WS-ADMIN-MAP)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS SEND MAP('COADM01')
                MAPSET('COADM01')
                FROM(WS-ADMIN-MAP)
                ERASE
                RESP(WS-RESP-CD)
           END-EXEC.
       P630-EXIT.
           EXIT.
       CARD-LIST SECTION.
       P640-CARD-LIST.
           EXEC CICS LINK PROGRAM('COCRDLIC')
                COMMAREA(DFHCOMMAREA)
                LENGTH(WS-CA-LENGTH)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS RECEIVE MAP('COCRDLI')
                MAPSET('COCRDLI')
                INTO(WS-CARD-LIST-MAP)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS SEND MAP('COCRDLI')
                MAPSET('COCRDLI')
                FROM(WS-CARD-LIST-MAP)
                RESP(WS-RESP-CD)
           END-EXEC.
       P640-EXIT.
           EXIT.
       CARD-VIEW SECTION.
       P650-CARD-VIEW.
           EXEC CICS LINK PROGRAM('COCRDSLC')
                COMMAREA(DFHCOMMAREA)
                LENGTH(WS-CA-LENGTH)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS RECEIVE MAP('COCRDSL')
                MAPSET('COCRDSL')
                INTO(WS-CARD-VIEW-MAP)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS SEND MAP('COCRDSL')
                MAPSET('COCRDSL')
                FROM(WS-CARD-VIEW-MAP)
                RESP(WS-RESP-CD)
           END-EXEC.
       P650-EXIT.
           EXIT.
       CARD-UPDATE SECTION.
       P660-CARD-UPDATE.
           EXEC CICS LINK PROGRAM('COCRDUPC')
                COMMAREA(DFHCOMMAREA)
                LENGTH(WS-CA-LENGTH)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS RECEIVE MAP('COCRDUP')
                MAPSET('COCRDUP')
                INTO(WS-CARD-UP-MAP)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS SEND MAP('COCRDUP')
                MAPSET('COCRDUP')
                FROM(WS-CARD-UP-MAP)
                RESP(WS-RESP-CD)
           END-EXEC.
       P660-EXIT.
           EXIT.
       SIGNON SECTION.
       P670-SIGNON.
           EXEC CICS LINK PROGRAM('COSGN00C')
                COMMAREA(DFHCOMMAREA)
                LENGTH(WS-CA-LENGTH)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS RECEIVE MAP('COSGN00')
                MAPSET('COSGN00')
                INTO(WS-SIGNON-MAP)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS SEND MAP('COSGN00')
                MAPSET('COSGN00')
                FROM(WS-SIGNON-MAP)
                ERASE
                RESP(WS-RESP-CD)
           END-EXEC.
       P670-EXIT.
           EXIT.
       END-BROWSE SECTION.
       P700-ENDBR.
           EXEC CICS ENDBR
                FILE('TRANSACT')
                RESP(WS-RESP-CD)
           END-EXEC.
       P700-EXIT.
           EXIT.
       RETURN-MENU SECTION.
       P800-RETURN-MENU.
           EXEC CICS SEND TEXT
                FROM(DFHCOMMAREA)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS RECEIVE MAP('COMEN01')
                MAPSET('COMEN01')
                INTO(WS-MENU-MAP)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS SEND MAP('COMEN01')
                MAPSET('COMEN01')
                FROM(WS-MENU-MAP)
                ERASE
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS XCTL PROGRAM('COMEN01C')
                COMMAREA(DFHCOMMAREA)
                LENGTH(WS-CA-LENGTH)
           END-EXEC.
       P800-EXIT.
           EXIT.
       ABEND-HANDLER SECTION.
       P900-ABEND.
           EXEC CICS LINK PROGRAM('COERR00C')
                COMMAREA(DFHCOMMAREA)
                LENGTH(WS-CA-LENGTH)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS ABEND
                ABCODE('CDE1')
           END-EXEC.
       P900-EXIT.
           EXIT.
      * Upstream COACTUPC procedure COPY — CSUTLDPY resolves (date-edit paras).
           COPY CSUTLDPY.
