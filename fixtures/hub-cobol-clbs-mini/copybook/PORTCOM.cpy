      *>*****************************************************************
      *> Mini portfolio COMMAREA for PORTONLN + PORTCOMRN CRUD prove.
      *> Free-form comments so GnuCOBOL -free programs (PORTCOMRN) can
      *> COPY this book. PORT-FN drives CREATE/READ/UPDATE/DELETE.
      *>*****************************************************************
           05  PORT-FN              PIC X(4).
               88  PORT-CREATE           VALUE 'CREA'.
               88  PORT-READ             VALUE 'READ'.
               88  PORT-UPDATE           VALUE 'UPDT'.
               88  PORT-DELETE           VALUE 'DELE'.
           05  PORT-USER            PIC X(8).
           05  PORT-ASSET-ID        PIC X(12).
           05  PORT-RC              PIC 99 VALUE 0.
           05  PORT-MSG             PIC X(40).
