      ******************************************************************
      * CLBS-shaped online inquiry (deepened from upstream INQONLN).
      * Idiom fixture — not a full vendored copy. CICS = honest holes.
      * COMMAREA/map COPY: INQCOM/ERRHND/INQPORT resolve under copybook/;
      * EXTFMAP stays an honest unresolved COPY hole (no BMS map shipped).
      * Catalogued EXEC CICS: HANDLE CONDITION/AID, RECEIVE/SEND MAP,
      * LINK, XCTL, RETURN, READ, WRITE, STARTBR, WRITEQ/READQ/DELETEQ,
      * ENQ/DEQ — no fake runtime.
      ******************************************************************
       IDENTIFICATION DIVISION.
       PROGRAM-ID. INQONLN.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-COMMAREA.
           COPY INQCOM.
       01  WS-FLAGS.
           05 WS-END-OF-SESSION     PIC X VALUE 'N'.
              88 SESSION-ACTIVE           VALUE 'N'.
              88 SESSION-TERMINATED       VALUE 'Y'.
           05 WS-RESPONSE-CODE      PIC S9(8) COMP.
           05 WS-COMMAREA-FUNCTION  PIC X(4) VALUE 'MENU'.
       01  WS-ERROR-AREA.
           COPY ERRHND.
       01  WS-SECURITY-REQUEST.
           05 SEC-REQUEST-TYPE     PIC X.
           05 SEC-USER-ID          PIC X(8).
           05 SEC-RESOURCE-NAME    PIC X(8).
           05 SEC-ACCESS-TYPE      PIC X(8).
           05 SEC-RESPONSE-CODE    PIC S9(8) COMP.
           05 SEC-ERROR-INFO       PIC X(80).
       01  WS-PORTFOLIO-REC.
           COPY INQPORT.
       01  WS-EXTERNAL-MAP.
           COPY EXTFMAP.
       LINKAGE SECTION.
       01  DFHCOMMAREA.
           COPY INQCOM.
       PROCEDURE DIVISION.
       MAIN-LOGIC SECTION.
           EXEC CICS HANDLE CONDITION
                ERROR(P900-ERROR-ROUTINE)
                PGMIDERR(P900-ERROR-ROUTINE)
                NOTFND(P900-ERROR-ROUTINE)
                ENDFILE(P900-ERROR-ROUTINE)
           END-EXEC.
           EXEC CICS HANDLE AID
                PF3(P800-EXIT-SESSION)
                PF12(P800-EXIT-SESSION)
           END-EXEC.
           PERFORM P100-PROCESS-REQUEST
              THRU P100-EXIT
              UNTIL SESSION-TERMINATED.
           EXEC CICS RETURN END-EXEC.
           GOBACK.
       REQUEST-ROUTER SECTION.
       P100-PROCESS-REQUEST.
           EXEC CICS RECEIVE MAP('INQMAP')
                MAPSET('INQSET')
                INTO(WS-COMMAREA)
                RESP(WS-RESPONSE-CODE)
           END-EXEC.
           EVALUATE WS-COMMAREA-FUNCTION
               WHEN 'MENU'
                   PERFORM P200-DISPLAY-MENU THRU P200-EXIT
               WHEN 'INQP'
                   PERFORM P300-PORTFOLIO-INQUIRY THRU P300-EXIT
               WHEN 'INQH'
                   PERFORM P400-HISTORY-INQUIRY THRU P400-EXIT
               WHEN 'XFER'
                   PERFORM P500-TRANSFER-CONTROL THRU P500-EXIT
               WHEN 'EXIT'
                   SET SESSION-TERMINATED TO TRUE
               WHEN OTHER
                   PERFORM P900-ERROR-ROUTINE THRU P900-EXIT
           END-EVALUATE.
           PERFORM P050-SECURITY-CHECK THRU P050-EXIT.
       P100-EXIT.
           EXIT.
       SECURITY-CHECK SECTION.
       P050-SECURITY-CHECK.
           EXEC CICS ENQ
                RESOURCE(WS-SECURITY-REQUEST)
                RESP(WS-RESPONSE-CODE)
           END-EXEC.
           EXEC CICS LINK PROGRAM('SECMGR')
                COMMAREA(WS-SECURITY-REQUEST)
                RESP(WS-RESPONSE-CODE)
           END-EXEC.
           EXEC CICS DEQ
                RESOURCE(WS-SECURITY-REQUEST)
                RESP(WS-RESPONSE-CODE)
           END-EXEC.
       P050-EXIT.
           EXIT.
       SCREEN-IO SECTION.
       P200-DISPLAY-MENU.
           EXEC CICS SEND MAP('INQMNU')
                MAPSET('INQSET')
                ERASE
                RESP(WS-RESPONSE-CODE)
           END-EXEC.
       P200-EXIT.
           EXIT.
       PORTFOLIO-INQUIRY SECTION.
       P300-PORTFOLIO-INQUIRY.
           EXEC CICS READ
                FILE('PORTFILE')
                INTO(WS-PORTFOLIO-REC)
                RIDFLD(WS-COMMAREA)
                RESP(WS-RESPONSE-CODE)
           END-EXEC.
           EXEC CICS WRITEQ TS
                QUEUE('INQTMP')
                FROM(WS-COMMAREA)
                RESP(WS-RESPONSE-CODE)
           END-EXEC.
           EXEC CICS READQ TS
                QUEUE('INQTMP')
                INTO(WS-COMMAREA)
                RESP(WS-RESPONSE-CODE)
           END-EXEC.
           EXEC CICS DELETEQ TS
                QUEUE('INQTMP')
                RESP(WS-RESPONSE-CODE)
           END-EXEC.
           EXEC CICS LINK PROGRAM('INQPORT')
                COMMAREA(WS-COMMAREA)
                RESP(WS-RESPONSE-CODE)
           END-EXEC.
       P300-EXIT.
           EXIT.
       HISTORY-INQUIRY SECTION.
       P400-HISTORY-INQUIRY.
           EXEC CICS STARTBR
                FILE('HISTFILE')
                RIDFLD(WS-COMMAREA)
                RESP(WS-RESPONSE-CODE)
           END-EXEC.
           EXEC CICS LINK PROGRAM('INQHIST')
                COMMAREA(WS-COMMAREA)
                RESP(WS-RESPONSE-CODE)
           END-EXEC.
       P400-EXIT.
           EXIT.
       TRANSFER-CONTROL SECTION.
       P500-TRANSFER-CONTROL.
           EXEC CICS XCTL PROGRAM('INQMENU')
                COMMAREA(WS-COMMAREA)
           END-EXEC.
       P500-EXIT.
           EXIT.
       SESSION-EXIT SECTION.
       P800-EXIT-SESSION.
           SET SESSION-TERMINATED TO TRUE.
           EXEC CICS WRITE
                FILE('AUDFILE')
                FROM(WS-COMMAREA)
                RESP(WS-RESPONSE-CODE)
           END-EXEC.
       P800-EXIT.
           EXIT.
       ERROR-HANDLER SECTION.
       P900-ERROR-ROUTINE.
           EXEC CICS LINK PROGRAM('ERRHNDL')
                COMMAREA(WS-COMMAREA)
                RESP(WS-RESPONSE-CODE)
           END-EXEC.
       P900-EXIT.
           EXIT.
