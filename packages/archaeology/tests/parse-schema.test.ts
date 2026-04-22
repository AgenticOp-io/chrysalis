import { describe, expect, it } from "vitest";
import { parseSchema } from "../src/index.js";

describe("parseSchema", () => {
  it("parses a trivial table", () => {
    const r = parseSchema(`CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL);`);
    expect(r.tables).toHaveLength(1);
    const t = r.tables[0]!;
    expect(t.name).toBe("users");
    expect(t.columns.map((c) => c.name)).toEqual(["id", "name"]);
    expect(t.columns[0]!.primaryKey).toBe(true);
    expect(t.columns[1]!.notNull).toBe(true);
  });

  it("parses the tiny-blog schema end-to-end", () => {
    const ddl = `
CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT    NOT NULL UNIQUE,
    password    TEXT    NOT NULL,
    created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    author_id   INTEGER NOT NULL REFERENCES users(id),
    title       TEXT    NOT NULL,
    body        TEXT    NOT NULL,
    status      TEXT    NOT NULL DEFAULT 'published'
                        CHECK (status IN ('draft', 'published', 'archived')),
    created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;
    const r = parseSchema(ddl, "schema.sql");
    expect(r.tables.map((t) => t.name)).toEqual(["users", "posts"]);
    const posts = r.tables.find((t) => t.name === "posts")!;
    const authorId = posts.columns.find((c) => c.name === "author_id")!;
    expect(authorId.references).toEqual({ table: "users", column: "id" });
    const status = posts.columns.find((c) => c.name === "status")!;
    expect(status.checkIn).toEqual(["draft", "published", "archived"]);
    expect(status.defaultValue).toBe("'published'");
    // CHECK (col IN (...)) on a TEXT column should promote to enum.
    expect(status.type.kind).toBe("enum");
  });

  it("recognizes VARCHAR(n) maxLen", () => {
    const r = parseSchema(`CREATE TABLE t (s VARCHAR(120) NOT NULL);`);
    const col = r.tables[0]!.columns[0]!;
    expect(col.type.kind).toBe("string");
    expect(col.type.kind === "string" && col.type.maxLen).toBe(120);
  });

  it("recognizes ENUM('a','b','c')", () => {
    const r = parseSchema(`CREATE TABLE t (role ENUM('admin','member','guest') NOT NULL);`);
    const col = r.tables[0]!.columns[0]!;
    expect(col.type.kind).toBe("enum");
    expect(col.type.kind === "enum" && [...col.type.values]).toEqual(["admin", "member", "guest"]);
  });

  it("tolerates comments", () => {
    const r = parseSchema(`
-- leading comment
CREATE TABLE t ( -- trailing
  id INT NOT NULL -- line
);
/* block comment */
`);
    expect(r.tables).toHaveLength(1);
  });
});
