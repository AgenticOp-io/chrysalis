       IDENTIFICATION DIVISION.
       PROGRAM-ID. PAY.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01 WS-IN   PIC X(80).
       01 WS-PATH PIC X(40).
       PROCEDURE DIVISION.
           ACCEPT WS-PATH FROM ENVIRONMENT "REQUEST_PATH"
           ACCEPT WS-IN FROM CONSOLE
           IF WS-PATH = "/bad"
               MOVE 1 TO RETURN-CODE
           ELSE
               DISPLAY '{"ok":true}'
           END-IF
           STOP RUN.
