      * Chrysalis labeled extract — COPY REPLACING pseudo-text (G10124)
       IDENTIFICATION DIVISION.
       PROGRAM-ID. COPYPSEU.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
           COPY CUSTREC REPLACING ==CUST-== BY ==WS-CUST-==
                                  ==ACCT-== BY ==WS-ACCT-==.
       PROCEDURE DIVISION.
           GOBACK.
