import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  collectFormFieldEvidence,
  extractFormControlHits,
  extractSqlTableRefsFromPhp,
  mergeSchema,
  parseSchema,
} from "../src/index.js";

describe("extractFormControlHits", () => {
  it("finds input/select/textarea name attributes in PHP source", () => {
    const src = `<?php
echo '<input name="title" type="text"/>';
echo '<select name="role"></select>';
?>
<textarea name="body"></textarea>
`;
    const hits = extractFormControlHits(src, "x.php");
    const names = hits.map((h) => h.name).sort();
    expect(names).toEqual(["body", "role", "title"]);
    const title = hits.find((h) => h.name === "title")!;
    expect(title.line).toBe(2);
    expect(title.inputType).toBe("text");
  });
});

describe("extractSqlTableRefsFromPhp", () => {
  it("collects table names from common SQL clauses", () => {
    const src = `INSERT INTO posts (x) VALUES (1); UPDATE users SET a=1; SELECT * FROM comments c JOIN users u ON u.id=c.author_id;`;
    const t = new Set(extractSqlTableRefsFromPhp(src));
    expect(t.has("posts")).toBe(true);
    expect(t.has("users")).toBe(true);
    expect(t.has("comments")).toBe(true);
  });
});

describe("collectFormFieldEvidence + mergeSchema", () => {
  it("merges form provenance onto the resolved DDL column", () => {
    const dir = mkdtempSync(join(tmpdir(), "ch-arch-form-"));
    try {
      writeFileSync(
        join(dir, "create_post.php"),
        `<?php
exec_sql("INSERT INTO posts (author_id, title, body) VALUES (?,?,?)", []);
// probe: <input name="title"/><textarea name="body"></textarea>
`,
        "utf8",
      );
      const ddl = parseSchema(
        `CREATE TABLE posts (id INTEGER PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL);`,
        "schema.sql",
      );
      const evidence = collectFormFieldEvidence(ddl, [dir]);
      expect(evidence.unattributed.length).toBe(0);
      expect(evidence.attributed.length).toBeGreaterThanOrEqual(2);

      const report = mergeSchema(ddl, { byTable: new Map(), orphan: [] }, { phpRoots: [dir] });
      const title = report.entities[0]!.fields.find((f) => f.name === "title")!;
      expect(title.provenance.some((p) => p.kind === "form")).toBe(true);
      expect(title.provenance.find((p) => p.kind === "form")!.detail).toContain("name=\"title\"");
      expect(report.unattributedFormFields.length).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("prefers INSERT/UPDATE targets when a column name is shared across tables", () => {
    const dir = mkdtempSync(join(tmpdir(), "ch-arch-form3-"));
    try {
      writeFileSync(
        join(dir, "comment.php"),
        `<?php
query_one("SELECT id FROM posts WHERE id = ?", []);
exec_sql("INSERT INTO comments (post_id, author_id, body) VALUES (?,?,?)", []);
// <textarea name="body"></textarea>
`,
        "utf8",
      );
      const ddl = parseSchema(
        `CREATE TABLE posts (id INTEGER PRIMARY KEY, body TEXT NOT NULL);
         CREATE TABLE comments (id INTEGER PRIMARY KEY, body TEXT NOT NULL);`,
        "s.sql",
      );
      const report = mergeSchema(ddl, { byTable: new Map(), orphan: [] }, { phpRoots: [dir] });
      const comments = report.entities.find((e) => e.name === "comments")!;
      const body = comments.fields.find((f) => f.name === "body")!;
      expect(body.provenance.some((p) => p.kind === "form")).toBe(true);
      const posts = report.entities.find((e) => e.name === "posts")!;
      const postBody = posts.fields.find((f) => f.name === "body")!;
      expect(postBody.provenance.some((p) => p.kind === "form")).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("records unattributed controls when the column does not exist in DDL", () => {
    const dir = mkdtempSync(join(tmpdir(), "ch-arch-form2-"));
    try {
      writeFileSync(
        join(dir, "x.php"),
        `<?php
// <input name="alien_field_xyz"/>
`,
        "utf8",
      );
      const ddl = parseSchema(
        `CREATE TABLE posts (id INTEGER PRIMARY KEY, title TEXT NOT NULL);`,
        "s.sql",
      );
      const report = mergeSchema(ddl, { byTable: new Map(), orphan: [] }, { phpRoots: [dir] });
      expect(report.unattributedFormFields.some((u) => u.name === "alien_field_xyz")).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
