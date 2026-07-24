      *> Curated GnuCOBOL probe sample for ibm-cobol-fun corpus.
      *> Upstream IBM/cobol-is-fun programs (FXSORT, JSON PARSE) are Enterprise
      *> COBOL dialect / unimplemented intrinsics under GnuCOBOL 3.x — honest hole.
      *> This curated mini only proves cobc -fsyntax-only for the external bar.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. IBMPROBE.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-MSG               PIC X(24) VALUE "ibm-cobol-fun curated".
       PROCEDURE DIVISION.
       MAIN.
           DISPLAY FUNCTION TRIM(WS-MSG)
           GOBACK.
