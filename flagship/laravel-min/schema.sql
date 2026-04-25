-- SQLite schema for laravel-min flagship (items + users for password login).
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL
);

DELETE FROM items;
DELETE FROM users;
INSERT INTO items (name) VALUES ('alpha'), ('beta');
-- Password is patched by `scripts/verify-flagship-laravel-min.mjs` (bcrypt of `secret`).
INSERT INTO users (username, password) VALUES ('flagship', '');
