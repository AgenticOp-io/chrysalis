      ******************************************************************
      * CLBS-shaped online inquiry shell (inspired by INQONLN.cbl).
      * Not a vendored copy of the upstream suite — idiom fixture only.
      * CICS / COPY / LINK remain honest holes until adapters bind.
      ******************************************************************
       IDENTIFICATION DIVISION.
       PROGRAM-ID. INQONLN.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-COMMAREA.
           COPY INQCOM.
       01  WS-FLAGS.
           05 WS-END-OF-SESSION     PIC X VALUE 'N'.
           05 WS-RESPONSE-CODE      PIC S9(8) COMP.
       PROCEDURE DIVISION.
           EXEC CICS HANDLE CONDITION
                ERROR(P900-ERROR-ROUTINE)
           END-EXEC.
           PERFORM P100-PROCESS-REQUEST
              THRU P100-EXIT.
           EXEC CICS RETURN END-EXEC.
           GOBACK.
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
               WHEN 'EXIT'
                   CONTINUE
               WHEN OTHER
                   PERFORM P900-ERROR-ROUTINE THRU P900-EXIT
           END-EVALUATE.
       P100-EXIT.
           EXIT.
       P200-DISPLAY-MENU.
           EXEC CICS SEND MAP('INQMNU')
                MAPSET('INQSET')
                ERASE
           END-EXEC.
       P200-EXIT.
           EXIT.
       P300-PORTFOLIO-INQUIRY.
           EXEC CICS LINK PROGRAM('INQPORT')
                COMMAREA(WS-COMMAREA)
           END-EXEC.
       P300-EXIT.
           EXIT.
       P400-HISTORY-INQUIRY.
           EXEC CICS LINK PROGRAM('INQHIST')
                COMMAREA(WS-COMMAREA)
           END-EXEC.
       P400-EXIT.
           EXIT.
       P900-ERROR-ROUTINE.
           EXEC CICS LINK PROGRAM('ERRHNDL')
                COMMAREA(WS-COMMAREA)
           END-EXEC.
       P900-EXIT.
           EXIT.
