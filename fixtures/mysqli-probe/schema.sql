-- Reference schema for a MySQL-backed deployment of mysqli-probe (ingest does not execute SQL).
CREATE TABLE widgets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1
);
