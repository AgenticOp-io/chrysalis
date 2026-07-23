      *> Multi-paragraph COBOL structured fixture (PROCEDURE paragraphs → routes)
       IDENTIFICATION DIVISION.
       PROGRAM-ID. HUB-STRUCTURED.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-OK         PIC X VALUE "Y".
       01  WS-SERVICE    PIC X(32) VALUE "hub-gold-cobol-structured".
       PROCEDURE DIVISION.
       HEALTH.
      *> chrysalis-return: {"ok":true}
           MOVE TRUE TO WS-OK
           GOBACK.
       META.
      *> chrysalis-return: {"service":"hub-gold-cobol-structured","version":1}
           GOBACK.
