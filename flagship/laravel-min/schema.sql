-- SQLite schema for laravel-min flagship (read-only list route + verify seed).
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

DELETE FROM items;
INSERT INTO items (name) VALUES ('alpha'), ('beta');
