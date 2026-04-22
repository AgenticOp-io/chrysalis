#!/usr/bin/env node
/**
 * Seed a SQLite DB for the tiny-blog *fixture* (the one the real PHP app reads
 * when we record via the Oracle). Matches the data that scripts/seed-db.mjs
 * produces for the generated project.
 */
import { mkdir, readFile, rm } from "node:fs/promises";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

const SCHEMA = "./fixtures/tiny-blog/schema.sql";
const OUT = "./fixtures/tiny-blog/blog.sqlite";

await rm(OUT, { force: true });
await mkdir(dirname(OUT), { recursive: true });

const db = new DatabaseSync(OUT);

const ddl = await readFile(SCHEMA, "utf8");
const cleaned = ddl
  .split("\n")
  .map((line) => line.replace(/--.*$/, ""))
  .join("\n");

db.exec(cleaned);

db.exec(`
  INSERT INTO users (id, username, password) VALUES
    (1, 'alice', 'alice-password'),
    (2, 'bob',   'bob-password');
  INSERT INTO posts (id, author_id, title, body, status, created_at) VALUES
    (1, 1, 'First post', 'Hello, chrysalis world.', 'published', CURRENT_TIMESTAMP),
    (2, 2, 'Second post', 'Migration in progress.', 'published', CURRENT_TIMESTAMP);
  INSERT INTO comments (post_id, author_id, body, created_at) VALUES
    (1, 2, 'Nice to meet you', CURRENT_TIMESTAMP);
`);

console.log(`seeded ${OUT}`);
console.log(`users:    ${db.prepare("SELECT COUNT(*) AS n FROM users").get().n}`);
console.log(`posts:    ${db.prepare("SELECT COUNT(*) AS n FROM posts").get().n}`);
