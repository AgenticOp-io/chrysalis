      ******************************************************************
      * CLBS portfolio-shaped online structural probe (new fixture).
      * Idioms: HANDLE CONDITION/AID, VERIFY, SUSPEND, GETMAIN/FREEMAIN,
      * WRITEQ/READQ/DELETEQ, ENQ/DEQ, RECEIVE/SEND MAP, LINK/XCTL/RETURN.
      * PORTCOM drives POSN/HIST/XFER plus CREA/READ/UPDT/DELE CRUD arms
      * (honest exec-cics holes — no fake CICS/INDEXED runtime).
      ******************************************************************
       IDENTIFICATION DIVISION.
       PROGRAM-ID. PORTONLN.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-COMMAREA.
           COPY PORTCOM.
       01  WS-FLAGS.
           05 WS-RESP-CD            PIC S9(8) COMP VALUE 0.
           05 WS-PTR                PIC S9(8) COMP VALUE 0.
           05 WS-USER               PIC X(8) VALUE SPACES.
           05 WS-PASS               PIC X(8) VALUE SPACES.
       PROCEDURE DIVISION.
       MAIN-LOGIC SECTION.
           EXEC CICS HANDLE CONDITION
                ERROR(P900-ERR)
                NOTAUTH(P900-ERR)
                PGMIDERR(P900-ERR)
           END-EXEC.
           EXEC CICS HANDLE AID
                PF3(P800-EXIT)
                PF12(P800-EXIT)
           END-EXEC.
           EXEC CICS VERIFY
                PASSWORD(WS-PASS)
                USERID(WS-USER)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS SUSPEND
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS GETMAIN
                SET(WS-PTR)
                LENGTH(200)
                RESP(WS-RESP-CD)
           END-EXEC.
           PERFORM P100-ROUTE THRU P100-EXIT.
           EXEC CICS FREEMAIN
                DATA(WS-PTR)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS RETURN END-EXEC.
           GOBACK.
       REQUEST-ROUTER SECTION.
       P100-ROUTE.
           EXEC CICS RECEIVE MAP('PORTMAP')
                MAPSET('PORTSET')
                INTO(WS-COMMAREA)
                RESP(WS-RESP-CD)
           END-EXEC.
           EVALUATE TRUE
               WHEN PORT-CREATE
                   PERFORM P500-CRUD THRU P500-EXIT
               WHEN PORT-READ
                   PERFORM P500-CRUD THRU P500-EXIT
               WHEN PORT-UPDATE
                   PERFORM P500-CRUD THRU P500-EXIT
               WHEN PORT-DELETE
                   PERFORM P500-CRUD THRU P500-EXIT
               WHEN OTHER
                   EVALUATE PORT-FN
                       WHEN 'POSN'
                           PERFORM P200-POSITION THRU P200-EXIT
                       WHEN 'HIST'
                           PERFORM P300-HISTORY THRU P300-EXIT
                       WHEN 'XFER'
                           PERFORM P400-XFER THRU P400-EXIT
                       WHEN OTHER
                           PERFORM P900-ERR THRU P900-EXIT
                   END-EVALUATE
           END-EVALUATE.
       P100-EXIT.
           EXIT.
       POSITION-VIEW SECTION.
       P200-POSITION.
           EXEC CICS ENQ
                RESOURCE(WS-COMMAREA)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS WRITEQ TS
                QUEUE('PORTTMP')
                FROM(WS-COMMAREA)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS READQ TS
                QUEUE('PORTTMP')
                INTO(WS-COMMAREA)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS DELETEQ TS
                QUEUE('PORTTMP')
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS LINK PROGRAM('PORTPOS')
                COMMAREA(WS-COMMAREA)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS SEND MAP('PORTPOS')
                MAPSET('PORTSET')
                FROM(WS-COMMAREA)
                ERASE
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS DEQ
                RESOURCE(WS-COMMAREA)
                RESP(WS-RESP-CD)
           END-EXEC.
       P200-EXIT.
           EXIT.
       HISTORY-VIEW SECTION.
       P300-HISTORY.
           EXEC CICS LINK PROGRAM('PORTHIST')
                COMMAREA(WS-COMMAREA)
                RESP(WS-RESP-CD)
           END-EXEC.
       P300-EXIT.
           EXIT.
       TRANSFER-CONTROL SECTION.
       P400-XFER.
           EXEC CICS XCTL PROGRAM('PORTMENU')
                COMMAREA(WS-COMMAREA)
           END-EXEC.
       P400-EXIT.
           EXIT.
       CRUD-CONTROL SECTION.
       P500-CRUD.
           EXEC CICS LINK PROGRAM('PORTMSTR')
                COMMAREA(WS-COMMAREA)
                RESP(WS-RESP-CD)
           END-EXEC.
           EXEC CICS SEND MAP('PORTCRUD')
                MAPSET('PORTSET')
                FROM(WS-COMMAREA)
                RESP(WS-RESP-CD)
           END-EXEC.
       P500-EXIT.
           EXIT.
       SESSION-EXIT SECTION.
       P800-EXIT.
           EXEC CICS RETURN END-EXEC.
       P800-DONE.
           EXIT.
       ERROR-HANDLER SECTION.
       P900-ERR.
           EXEC CICS LINK PROGRAM('PORTERR')
                COMMAREA(WS-COMMAREA)
                RESP(WS-RESP-CD)
           END-EXEC.
       P900-EXIT.
           EXIT.
